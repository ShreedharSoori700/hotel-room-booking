const API="http://localhost:5000/api";
const token=()=>localStorage.getItem("hotelToken");
const currentUser=()=>JSON.parse(localStorage.getItem("hotelUser")||"null");
async function api(path, options={}){options.headers={...(options.headers||{}),"Content-Type":"application/json"};if(token())options.headers.Authorization=`Bearer ${token()}`;const r=await fetch(API+path,options);let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.message||"Request failed");return d}
function logout(){localStorage.removeItem("hotelToken");localStorage.removeItem("hotelUser");location.href="index.html"}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function msg(el,text,ok=false){el.textContent=text;el.style.color=ok?"#26723b":"#a02b2b"}
function generateQrSvg(data,size=128){const matrixSize=21;const cell=size/matrixSize;const seed=[...data].reduce((acc,ch,idx)=>((acc*31 + ch.charCodeAt(0) + idx)>>>0),123456789);const matrix=Array.from({length:matrixSize},()=>Array(matrixSize).fill(0));const addFinder=(x,y)=>{for(let row=0;row<7;row++){for(let col=0;col<7;col++){const inside=row===0||row===6||col===0||col===6;const center=row>=2&&row<=4&&col>=2&&col<=4;matrix[y+row][x+col]=inside||center?1:0;}}};addFinder(0,0);addFinder(matrixSize-7,0);addFinder(0,matrixSize-7);for(let y=0;y<matrixSize;y++){for(let x=0;x<matrixSize;x++){if((x<7&&y<7)||(x<7&&y>matrixSize-8)||(x>matrixSize-8&&y<7))continue;const enabled=((seed + x*17 + y*31 + (x*y)*13) % 2)===0;matrix[y][x]=enabled?1:0;}}let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Payment QR code"><rect width="${size}" height="${size}" fill="#ffffff"/><g fill="#111111">`;for(let y=0;y<matrixSize;y++){for(let x=0;x<matrixSize;x++){if(matrix[y][x])svg+=`<rect x="${x*cell+1}" y="${y*cell+1}" width="${Math.max(2,cell-2)}" height="${Math.max(2,cell-2)}" />`;}}svg+=`</g></svg>`;return svg;}
function printBill(){window.print()}

document.addEventListener("DOMContentLoaded",async()=>{
  const register=document.getElementById("registerForm");
  if(register){
    const nameInput=document.getElementById("name");
    const emailInput=document.getElementById("email");
    const phoneInput=document.getElementById("phone");
    const passwordInput=document.getElementById("password");
    const confirmPasswordInput=document.getElementById("confirmPassword");

    register.onsubmit=async e=>{e.preventDefault();const m=document.getElementById("formMsg");try{const body={name:nameInput.value.trim(),email:emailInput.value.trim(),phone:phoneInput.value.trim(),password:passwordInput.value,confirmPassword:confirmPasswordInput.value};const d=await api("/auth/register",{method:"POST",body:JSON.stringify(body)});msg(m,d.message,true);register.reset();setTimeout(()=>location.href="login.html",700)}catch(x){msg(m,x.message)}};
  }

  const login=document.getElementById("loginForm");
  const adminLogin=document.getElementById("adminLoginForm");
  for(const form of [login,adminLogin].filter(Boolean))form.onsubmit=async e=>{e.preventDefault();const m=form.querySelector(".msg");try{const d=await api("/auth/login",{method:"POST",body:JSON.stringify({email:form.querySelector("#email").value,password:form.querySelector("#password").value})});if(form===adminLogin&&d.user.role!=="admin")throw Error("This account is not an admin");localStorage.setItem("hotelToken",d.token);localStorage.setItem("hotelUser",JSON.stringify(d.user));location.href=d.user.role==="admin"?"admin.html":"rooms.html"}catch(x){msg(m,x.message)}};

  if(document.getElementById("roomGrid"))loadRooms();
  if(document.getElementById("selectedRoom"))initBooking();
  if(document.getElementById("bookingList"))loadMyBookings();
  if(document.getElementById("adminRooms"))loadAdmin();
  if(document.getElementById("roomForm"))document.getElementById("roomForm").onsubmit=saveRoom;
});

async function loadRooms(){
  try{
    const rooms=await api("/rooms");
    roomGrid.innerHTML=rooms.map(r=>{
      const allAmenities=Object.values(r.amenities||{}).flat();
      const amenitiesHtml=allAmenities.length>0?`<div class="amenities-display">${allAmenities.map(a=>`<span class="amenity-tag">${esc(a)}</span>`).join("")}</div>`:"";
      return `<article class="room-card">
        <img src="${esc(r.image||'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80')}" alt="${esc(r.roomType)}">
        <div class="room-content">
          <span class="tag">${esc(r.status)}</span>
          <h3>${esc(r.roomType)} Room ${esc(r.roomNumber)}</h3>
          <p>👥 Up to ${r.capacity} guests</p>
          ${r.bedInfo?`<p>🛏️ ${esc(r.bedInfo)}</p>`:""}
          ${r.facilities&&r.facilities.length>0?`<p>${esc(r.facilities.join(" • "))}</p>`:""}
          ${amenitiesHtml}
          <p class="price">₹${r.price.toLocaleString("en-IN")} / night</p>
          ${r.status==="Available"?`<a class="btn" href="booking.html?room=${r._id}">Book Now</a>`:"<button class='btn secondary' disabled>Unavailable</button>"}
        </div>
      </article>`;
    }).join("");
  }catch(e){
    roomGrid.innerHTML=`<p>${esc(e.message)}</p>`;
  }
}
async function initBooking(){
  if(!token()){location.href="login.html";return}
  const id=new URLSearchParams(location.search).get("room");
  if(!id)return;
  try{
    const rooms=await api("/rooms");
    const r=rooms.find(x=>x._id===id);
    if(!r)throw Error("Room not found");
    window.bookingRoom=r;
    
    selectedRoom.innerHTML=`<div class="card"><h2>${esc(r.roomType)} Room ${esc(r.roomNumber)}</h2><p>₹${r.price.toLocaleString("en-IN")} / night • Capacity ${r.capacity}</p>${r.bedInfo?`<p>🛏️ ${esc(r.bedInfo)}</p>`:""}${r.description?`<p style="color:#666;">${esc(r.description)}</p>`:""}${r.facilities&&r.facilities.length>0?`<p>Facilities: ${esc(r.facilities.join(", "))}</p>`:""}</div>`;
    
    // Display amenities
    const amenitiesEl=document.getElementById("roomAmenities");
    if(amenitiesEl){
      const amenities=r.amenities||{};
      const hasAmenities=Object.values(amenities).some(arr=>arr.length>0);
      if(hasAmenities){
        let html="<h3>Room Amenities</h3>";
        const categories=[
          {key:"connectivity",title:"🌐 Connectivity"},
          {key:"entertainment",title:"🎬 Entertainment"},
          {key:"comfort",title:"🛏️ Comfort"},
          {key:"bathroom",title:"🚿 Bathroom"},
          {key:"kitchen",title:"🍽️ Kitchen"},
          {key:"safety",title:"🔒 Safety"},
          {key:"extra",title:"✨ Extra"}
        ];
        categories.forEach(cat=>{
          if(amenities[cat.key]&&amenities[cat.key].length>0){
            html+=`<div class="amenities-list"><h4>${cat.title}</h4><ul>${amenities[cat.key].map(a=>`<li>${esc(a)}</li>`).join("")}</ul></div>`;
          }
        });
        amenitiesEl.innerHTML=html;
        amenitiesEl.classList.remove("hidden");
      }
    }
    
    guests.max=r.capacity;
    const u=currentUser();
    guestName.value=u?.name||"";
    phone.value=u?.phone||"";
    const today=new Date().toISOString().slice(0,10);
    checkIn.min=today;
    checkOut.min=today;
    checkIn.onchange=()=>{checkOut.min=checkIn.value;updateTotal()};
    checkOut.onchange=updateTotal;
    guests.oninput=updateTotal;
  }catch(e){
    formMsg.textContent=e.message;
  }
}
function updateTotal(){if(!window.bookingRoom)return;const a=new Date(checkIn.value),b=new Date(checkOut.value);if(a<b){const n=Math.ceil((b-a)/86400000);totalBox.textContent=`${n} night(s) • Total: ₹${(n*bookingRoom.price).toLocaleString("en-IN")}`}else totalBox.textContent="Total: ₹0"}
if(document.getElementById("bookingForm"))document.getElementById("bookingForm").onsubmit=async e=>{e.preventDefault();const m=formMsg;try{const d=await api("/bookings",{method:"POST",body:JSON.stringify({roomId:bookingRoom._id,guestName:guestName.value,phone:phone.value,checkIn:checkIn.value,checkOut:checkOut.value,guests:Number(guests.value)})});msg(m,`Booking created: ${d.bookingId}. Payment can be completed from My Bookings.`,true);setTimeout(()=>location.href="my-bookings.html",1200)}catch(x){msg(m,x.message)}};

function showBill(booking){const bill=document.getElementById("billContainer");if(!bill)return;const now=new Date();const amount=Number(booking.amount||0);const gst=Math.round(amount*0.18);const subtotal=amount-gst;const guestName=booking.guestName||currentUser()?.name||"Guest";const hotelName="GrandStay Hotel";const invoiceNo=booking.invoiceNo||booking.bookingId||`INV-${Date.now().toString().slice(-6)}`;bill.innerHTML=`<div class="card" style="margin-bottom:20px;background:#fdfaf3;border:1px solid #d9b96d;border-radius:16px;padding:22px 20px;box-shadow:0 10px 20px rgba(0,0,0,0.06)"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap;border-bottom:1px solid #e9d9aa;padding-bottom:14px;margin-bottom:18px"><div><h2 style="margin:0 0 8px;color:#1d3b2f">${hotelName}</h2><p style="margin:0;color:#4d4d4d">Luxury Stay • Invoice</p></div><div style="text-align:right"><h3 style="margin:0;color:#1d3b2f">Receipt</h3><p style="margin:4px 0;color:#4d4d4d">Invoice No: ${esc(invoiceNo)}</p><p style="margin:0;color:#4d4d4d">Date: ${esc(new Date(now).toLocaleString("en-IN"))}</p></div></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:18px"><div><p style="margin:0 0 6px;color:#777">Guest</p><p style="margin:0;font-weight:600;color:#1d3b2f">${esc(guestName)}</p></div><div><p style="margin:0 0 6px;color:#777">Room</p><p style="margin:0;font-weight:600;color:#1d3b2f">${esc(booking.room || "-" )}</p></div><div><p style="margin:0 0 6px;color:#777">Booking ID</p><p style="margin:0;font-weight:600;color:#1d3b2f">${esc(booking.bookingId||"-")}</p></div></div><table style="width:100%;border-collapse:collapse;margin-bottom:16px"><thead><tr style="background:#f2e6c5"><th style="padding:10px 12px;text-align:left;color:#1d3b2f">Description</th><th style="padding:10px 12px;text-align:right;color:#1d3b2f">Amount</th></tr></thead><tbody><tr><td style="padding:10px 12px;border-bottom:1px solid #eee">Room stay charges</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">₹${subtotal.toLocaleString("en-IN")}</td></tr><tr><td style="padding:10px 12px;border-bottom:1px solid #eee">GST (18%)</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">₹${gst.toLocaleString("en-IN")}</td></tr></tbody></table><div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid #e9d9aa"><div><p style="margin:0;color:#777">Payment Status</p><strong style="color:#1d6f42">Paid</strong></div><div style="text-align:right"><p style="margin:0;color:#777">Total Paid</p><h3 style="margin:4px 0 0;color:#1d3b2f">₹${amount.toLocaleString("en-IN")}</h3></div></div></div>`;}async function loadMyBookings(){if(!token()){location.href="login.html";return}try{const bs=await api("/bookings/mine");if(!bs.length){bookingList.innerHTML="<p>No bookings yet. <a href='rooms.html'>Book a room</a>.</p>";return}bookingList.innerHTML=bs.map(b=>`<div class="card" style="margin:15px 0"><h3>${esc(b.room?.roomType)} Room ${esc(b.room?.roomNumber)} <span class="tag">${esc(b.bookingStatus)}</span></h3><p><b>${esc(b.bookingId)}</b> • ${new Date(b.checkIn).toLocaleDateString()} → ${new Date(b.checkOut).toLocaleDateString()}</p><p>${b.nights} night(s) • ${b.guests} guest(s) • <b>₹${b.totalAmount.toLocaleString("en-IN")}</b></p><p>Payment: <b>${esc(b.paymentStatus)}</b>${b.paymentId?` • ${esc(b.paymentId)}`:""}</p>${b.paymentStatus==="Pending"?`<button class="small-btn success" onclick="payBooking('${b._id}', ${b.totalAmount}, '${b.bookingId}', '${esc(b.room?.roomType || "Room")}')">Pay Now</button> `:""}<button class="small-btn danger" onclick="cancelBooking('${b._id}')">Cancel</button></div>`).join("")}catch(e){bookingList.innerHTML=`<p>${esc(e.message)}</p>`}}
async function cancelBooking(id){if(!confirm("Cancel this booking? Payment will not be refunded for cancelled bookings."))return;try{await api(`/bookings/${id}/cancel`,{method:"PATCH"});loadMyBookings()}catch(e){alert(e.message)}}

function closePaymentModal(){const modal=document.getElementById("paymentCheckoutModal");if(modal)modal.remove();}

function openPaymentModal({id, amount, bookingId, roomType}){
  const qr=generateQrSvg(`GRANDSTAY-${bookingId || id}`);
  const modal=document.createElement("div");
  modal.id="paymentCheckoutModal";
  modal.innerHTML=`<div style="position:fixed;inset:0;background:rgba(9,17,26,.60);display:flex;align-items:center;justify-content:center;padding:20px;z-index:1000"><div style="width:min(520px,100%);background:#ffffff;border-radius:22px;box-shadow:0 24px 60px rgba(0,0,0,.25);overflow:hidden;border:1px solid #e5d6a9"><div style="background:linear-gradient(135deg,#17362c,#235744);padding:24px 24px 18px;color:#fff"><div style="display:flex;align-items:center;justify-content:space-between"><div><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.8">Secure payment</div><h3 style="margin:8px 0 0;font-size:30px">GrandStay</h3></div><button type="button" data-close-payment style="border:0;background:rgba(255,255,255,.12);color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:22px">×</button></div></div><div style="padding:24px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px"><div><div style="color:#7a7a7a;font-size:12px;text-transform:uppercase;letter-spacing:1px">Booking</div><div style="font-weight:700;color:#17362c;margin-top:6px">${esc(roomType||"Room")}</div></div><div style="text-align:right"><div style="color:#7a7a7a;font-size:12px;text-transform:uppercase;letter-spacing:1px">Amount</div><div style="font-size:30px;font-weight:800;color:#1f4d3f;margin-top:6px">₹${Number(amount||0).toLocaleString("en-IN")}</div></div></div><div style="display:flex;align-items:center;justify-content:space-between;gap:16px;background:#f7f2e8;border:1px solid #e7d7ae;border-radius:16px;padding:16px;margin-bottom:18px"><div><div style="color:#6b6b6b;font-size:12px;letter-spacing:1px;text-transform:uppercase">Payment method</div><div style="font-weight:700;color:#243b32;margin-top:8px">Visa ending in 4242</div></div><div style="padding:8px;background:#fff;border:8px solid #1d3b2f;border-radius:10px;display:flex;align-items:center;justify-content:center">${qr}</div></div><div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#edf8f0;border:1px solid #cfe7d7;border-radius:12px;color:#246a3d;margin-bottom:18px"><span style="font-size:22px">🔒</span><span><strong>Protected checkout</strong><div style="font-size:12px;color:#466a58">Demo payment is encrypted and secured for testing.</div></span></div><div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0 4px;border-top:1px solid #eee;color:#4e4e4e"><span>Booking ID</span><strong>${esc(bookingId||"-")}</strong></div><div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0"><span>Fee type</span><strong>Hotel booking</strong></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" data-confirm-payment style="flex:1;min-width:180px;background:linear-gradient(135deg,#d4a53c,#b8862d);color:#fff;border:0;border-radius:12px;padding:16px 18px;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 12px 24px rgba(184,134,45,.26)">Pay ₹${Number(amount||0).toLocaleString("en-IN")} securely</button><button type="button" onclick="printBill()" style="border:1px solid #d4b15f;background:#fff;color:#1d3b2f;border-radius:12px;padding:16px 18px;font-size:16px;font-weight:700;cursor:pointer">Print QR</button></div></div></div></div>`;
  document.body.appendChild(modal);

  const closeBtn=modal.querySelector("[data-close-payment]");
  closeBtn.onclick=()=>closePaymentModal();
  const confirmBtn=modal.querySelector("[data-confirm-payment]");
  confirmBtn.onclick=async()=>{
    confirmBtn.disabled=true;
    confirmBtn.textContent="Processing payment...";
    try {
      const order = await api('/payment/order', { method: 'POST', body: JSON.stringify({ bookingId: id }) });
      if (order.demoMode) {
        await api('/payment/verify', {
          method: 'POST',
          body: JSON.stringify({ bookingId: id, demoMode: true, razorpay_order_id: order.orderId, razorpay_payment_id: 'DEMO_PAYMENT_' + Date.now(), razorpay_signature: 'demo_signature' })
        });
        closePaymentModal();
        showBill({ bookingId: bookingId || id, room: roomType || 'Room', amount: amount || 0, guestName: currentUser()?.name || 'Guest' });
        setTimeout(() => window.print(), 500);
        loadMyBookings();
        return;
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'GrandStay',
        description: 'Hotel booking payment',
        order_id: order.orderId,
        handler: async function(response) {
          try {
            await api('/payment/verify', {
              method: 'POST',
              body: JSON.stringify({ bookingId: id, razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature })
            });
            closePaymentModal();
            showBill({ bookingId: bookingId || id, room: roomType || 'Room', amount: amount || 0, guestName: currentUser()?.name || 'Guest' });
            setTimeout(() => window.print(), 500);
            loadMyBookings();
          } catch (e) {
            alert(e.message);
          }
        },
        theme: { color: '#0d6efd' }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      closePaymentModal();
    } catch (e) {
      confirmBtn.disabled=false;
      confirmBtn.textContent=`Pay ₹${Number(amount||0).toLocaleString("en-IN")} securely`;
      alert(e.message);
    }
  };
}

async function payBooking(id, amount, bookingId, roomType){
  try {
    if (!document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(s);
      await new Promise((resolve, reject) => {
        s.onload = resolve;
        s.onerror = () => reject(new Error('Razorpay script failed to load'));
      });
    }
    openPaymentModal({ id, amount, bookingId, roomType });
  } catch (e) {
    alert(e.message);
  }
}

async function loadAdmin(){try{const [rooms,users,bookings]=await Promise.all([api("/rooms"),api("/auth/users"),api("/bookings")]);const totalRevenue=bookings.reduce((sum,b)=>sum + Number(b.totalAmount||0),0);const paidRevenue=bookings.filter(b=>b.paymentStatus==="Paid").reduce((sum,b)=>sum + Number(b.totalAmount||0),0);stats.innerHTML=`<div class="stat"><span>Rooms</span><b>${rooms.length}</b></div><div class="stat"><span>Available</span><b>${rooms.filter(r=>r.status==="Available").length}</b></div><div class="stat"><span>Users</span><b>${users.length}</b></div><div class="stat"><span>Bookings</span><b>${bookings.length}</b></div><div class="stat"><span>Total Revenue</span><b>₹${totalRevenue.toLocaleString("en-IN")}</b></div><div class="stat"><span>Paid Amount</span><b>₹${paidRevenue.toLocaleString("en-IN")}</b></div>`;
adminRooms.innerHTML=`<table><tr><th>Room</th><th>Type</th><th>Price</th><th>Capacity</th><th>Status</th><th>Action</th></tr>${rooms.map(r=>`<tr><td>${esc(r.roomNumber)}</td><td>${esc(r.roomType)}</td><td>₹${r.price}</td><td>${r.capacity}</td><td>${esc(r.status)}</td><td><button class="small-btn" onclick='editRoom(${JSON.stringify(r)})'>Edit</button> <button class="small-btn danger" onclick="deleteRoom('${r._id}')">Delete</button></td></tr>`).join("")}</table>`;
adminUsers.innerHTML=`<table><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr>${users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone)}</td><td>${esc(u.role)}</td></tr>`).join("")}</table>`;
const bookingTableRows=bookings.map(b=>`<tr><td>${esc(b.bookingId)}</td><td>${esc(b.user?.name)}<br>${esc(b.user?.phone)}</td><td>${esc(b.room?.roomNumber)}</td><td>${new Date(b.checkIn).toLocaleDateString()} - ${new Date(b.checkOut).toLocaleDateString()}</td><td>₹${b.totalAmount}</td><td>${esc(b.paymentStatus)}</td><td>${esc(b.bookingStatus)}</td><td><button class="small-btn success" onclick="setBookingStatus('${b._id}','Confirmed')">Confirm</button> <button class="small-btn danger" onclick="setBookingStatus('${b._id}','Cancelled')">Cancel</button></td></tr>`).join("");
adminBookings.innerHTML=`<table><tr><th>ID</th><th>User</th><th>Room</th><th>Dates</th><th>Amount</th><th>Payment</th><th>Status</th><th>Action</th></tr>${bookingTableRows}<tr style="background:#f6f1e6;font-weight:700"><td colspan="4" style="text-align:right;padding:10px 12px;">Total</td><td colspan="4" style="padding:10px 12px;">₹${totalRevenue.toLocaleString("en-IN")}</td></tr></table>`;
}catch(e){alert("Admin: "+e.message)}}
function showRoomForm(){roomFormWrap.classList.remove("hidden");roomFormTitle.textContent="Add Room";roomForm.reset();roomId.value=""}
function hideRoomForm(){roomFormWrap.classList.add("hidden")}

function collectAmenities(){
  const amenities={connectivity:[],entertainment:[],comfort:[],bathroom:[],kitchen:[],safety:[],extra:[]};
  document.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
    if(cb.checked){
      const id=cb.id;
      if(id.startsWith("amenity-")){
        const category=id.split("-")[1];
        if(id==="amenity-wifi"||id==="amenity-cable")amenities.connectivity.push(cb.value);
        else if(id==="amenity-tv"||id==="amenity-streaming")amenities.entertainment.push(cb.value);
        else if(id==="amenity-ac"||id==="amenity-heating"||id==="amenity-mini-bar")amenities.comfort.push(cb.value);
        else if(id==="amenity-shower"||id==="amenity-bathrobe"||id==="amenity-toiletries")amenities.bathroom.push(cb.value);
        else if(id==="amenity-coffee"||id==="amenity-microwave"||id==="amenity-kitchenette")amenities.kitchen.push(cb.value);
        else if(id==="amenity-safe"||id==="amenity-keycard")amenities.safety.push(cb.value);
      }
    }
  });
  document.querySelectorAll('[id$="-list"] .amenity-tag').forEach(tag=>{
    const category=tag.dataset.category;
    if(category&&amenities[category])amenities[category].push(tag.dataset.value);
  });
  return amenities;
}

function displayAmenities(amenities){
  const categories=["connectivity","entertainment","comfort","bathroom","kitchen","safety"];
  categories.forEach(cat=>{
    const list=document.getElementById(cat+"-list");
    if(list){
      list.innerHTML=(amenities[cat]||[]).map(val=>`<div class="amenity-tag" data-category="${cat}" data-value="${esc(val)}">${esc(val)} <span onclick="removeAmenity(this)">×</span></div>`).join("");
    }
  });
}

function removeAmenity(el){el.parentElement.remove()}

function addCustomAmenity(category){
  const input=document.getElementById(`custom-${category}`);
  const value=input.value.trim();
  if(!value)return;
  const list=document.getElementById(category+"-list");
  const tag=document.createElement("div");
  tag.className="amenity-tag";
  tag.dataset.category=category;
  tag.dataset.value=value;
  tag.innerHTML=`${esc(value)} <span onclick="removeAmenity(this)">×</span>`;
  list.appendChild(tag);
  input.value="";
}

function editRoom(r){
  showRoomForm();
  roomFormTitle.textContent="Edit Room";
  roomId.value=r._id;
  roomNumber.value=r.roomNumber;
  roomType.value=r.roomType;
  roomPrice.value=r.price;
  roomCapacity.value=r.capacity;
  roomBedInfo.value=r.bedInfo||"Not specified";
  roomDescription.value=r.description||"";
  roomFacilities.value=(r.facilities||[]).join(", ");
  roomImage.value=r.image||"";
  roomStatus.value=r.status;
  
  // Set amenities checkboxes
  const amenitiesMap={
    "Free Wi-Fi":"amenity-wifi","Cable TV":"amenity-cable",
    "Smart TV":"amenity-tv","Streaming Services":"amenity-streaming",
    "Air Conditioning":"amenity-ac","Heating":"amenity-heating","Mini Bar":"amenity-mini-bar",
    "Rain Shower":"amenity-shower","Bathrobe & Slippers":"amenity-bathrobe","Premium Toiletries":"amenity-toiletries",
    "Coffee Maker":"amenity-coffee","Microwave":"amenity-microwave","Kitchenette":"amenity-kitchenette",
    "Safe":"amenity-safe","Key Card Access":"amenity-keycard"
  };
  
  document.querySelectorAll('input[type="checkbox"]').forEach(cb=>cb.checked=false);
  Object.entries(amenitiesMap).forEach(([value,id])=>{
    const cb=document.getElementById(id);
    if(cb){
      const allAmenities=Object.values(r.amenities||{}).flat();
      cb.checked=allAmenities.includes(value);
    }
  });
  
  displayAmenities(r.amenities||{});
  window.scrollTo({top:0,behavior:"smooth"});
}

async function saveRoom(e){
  e.preventDefault();
  try{
    const amenities=collectAmenities();
    const body={
      roomNumber:roomNumber.value,
      roomType:roomType.value,
      price:Number(roomPrice.value),
      capacity:Number(roomCapacity.value),
      facilities:roomFacilities.value.split(",").map(x=>x.trim()).filter(Boolean),
      amenities:amenities,
      bedInfo:roomBedInfo.value||"Not specified",
      description:roomDescription.value||"",
      image:roomImage.value,
      status:roomStatus.value
    };
    const id=roomId.value;
    await api(id?`/rooms/${id}`:"/rooms",{method:id?"PUT":"POST",body:JSON.stringify(body)});
    hideRoomForm();
    loadAdmin();
  }catch(x){
    msg(roomMsg,x.message);
  }
}
async function deleteRoom(id){if(!confirm("Delete this room?"))return;try{await api(`/rooms/${id}`,{method:"DELETE"});loadAdmin()}catch(e){alert(e.message)}}
async function setBookingStatus(id,status){try{await api(`/bookings/${id}/status`,{method:"PATCH",body:JSON.stringify({status})});loadAdmin()}catch(e){alert(e.message)}}

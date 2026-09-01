# Hotel Room Booking Management System

Full-stack hotel management project with:
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: MongoDB Atlas + Mongoose
- Authentication: JWT + bcrypt
- Validation: frontend + backend
- Admin dashboard: rooms, users, bookings
- Payment: Razorpay test-mode integration (optional)

## 1. Install
Open a terminal in `backend`:

```bash
npm install
```

## 2. Configure MongoDB Atlas
Create a MongoDB Atlas cluster, database user, and allow your IP address.

Copy `.env.example` to `.env` and set:

```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/hotel_booking?retryWrites=true&w=majority
JWT_SECRET=change_this_to_a_long_random_secret
ADMIN_EMAIL=admin@hotel.com
ADMIN_PASSWORD=Admin@123
```

Razorpay is optional. For real/test payment, also set:
```env
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
```

## 3. Start backend

```bash
npm run dev
```

Backend runs at:
`http://localhost:5000`

## 4. Open frontend

Use VS Code Live Server on `frontend/index.html`, or open it directly in a browser.

The frontend expects the API at:
`http://localhost:5000/api`

## Admin
On first backend start, an admin account is created from `.env`:
- Email: `admin@hotel.com`
- Password: `Admin@123`

Change these values before using the project outside a classroom/demo environment.

## Payment
The project supports Razorpay test mode. If Razorpay keys are missing, the booking can still be created with `paymentStatus: Pending`; this is useful for development. Do not expose the Razorpay secret key in frontend code.

## AWS DevOps workflow

This project is configured for an AWS-based CI/CD flow using GitHub Actions, Amazon ECR, and an EC2 deployment host.

### Required GitHub secrets
Set these secrets in the repository:

```bash
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_ECR_REPOSITORY
EC2_HOST
EC2_USERNAME
EC2_PRIVATE_KEY
MONGO_URI
JWT_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD
```

### CI process
- Push to the `main` branch
- GitHub Actions runs `npm install` and `npm test`
- The app is containerized with the Dockerfile
- The image is pushed to Amazon ECR
- The EC2 instance pulls the latest image and restarts the service

### Deployment command on EC2
```bash
sudo yum update -y
sudo amazon-linux-extras install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com

docker pull <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com/hotel-room-booking:latest

docker run -d --rm --name hotel-room-booking -p 80:80 -p 5000:5000 \
  -e PORT=5000 \
  -e MONGO_URI="mongodb+srv://USER:PASSWORD@cluster.mongodb.net/hotel_booking" \
  -e JWT_SECRET="your-secret" \
  -e ADMIN_EMAIL="admin@hotel.com" \
  -e ADMIN_PASSWORD="Admin@123" \
  <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com/hotel-room-booking:latest
```

### Release and rollback
```bash
# Release
aws ecr describe-images --repository-name hotel-room-booking --region us-east-1

docker pull <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com/hotel-room-booking:<old-tag>

docker stop hotel-room-booking

docker run -d --rm --name hotel-room-booking -p 80:80 -p 5000:5000 \
  -e PORT=5000 \
  -e MONGO_URI="mongodb+srv://USER:PASSWORD@cluster.mongodb.net/hotel_booking" \
  -e JWT_SECRET="your-secret" \
  -e ADMIN_EMAIL="admin@hotel.com" \
  -e ADMIN_PASSWORD="Admin@123" \
  <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com/hotel-room-booking:<old-tag>
```

### Health check
```bash
curl http://<ec2-public-ip>/api
```

### Log monitoring
```bash
docker logs -f hotel-room-booking
```

## AWS deployment architecture

- GitHub Actions builds and tests the code
- Docker image is pushed to Amazon ECR
- EC2 hosts the running container
- NGINX serves the frontend and proxies API traffic to the Node backend
- MongoDB Atlas stores the application data securely

## Environment variables
Create a `.env` file in the backend folder with values like:

```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/hotel_booking?retryWrites=true&w=majority
JWT_SECRET=change_this_to_a_long_random_secret
ADMIN_EMAIL=admin@hotel.com
ADMIN_PASSWORD=Admin@123
PORT=5000
```

## Docker / deployment notes
- The app is served by NGINX on port 80 and proxies API requests to the Node backend on port 5000.
- The Docker image is intended for local or cloud deployment and should be paired with a managed MongoDB connection string.

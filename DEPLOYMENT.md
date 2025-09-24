# Deployment Guide for Raspberry Pi

Deploying this web application to multiple Raspberry Pis involves three main stages: building the app, setting up a web server on the Pis, and creating a script to automate the deployment.

---

### Stage 1: Build the Application

First, you need to create a production-ready build of the application. This process bundles all the code into a set of static HTML, CSS, and JavaScript files inside a `dist` directory.

On your development machine, run the following command from the project's root directory:

```bash
npm run build
```

This will create a `dist` folder. This folder is your entire application; it's all you need to deploy.

---

### Stage 2: Prepare the Raspberry Pis (One-Time Setup)

Each Raspberry Pi needs a web server to serve the static files. **Nginx** is a lightweight, high-performance web server that is perfect for this task. You will need to SSH into each Pi and install it.

On each Raspberry Pi, run the following commands:

```bash
# Update your package list
sudo apt-get update

# Install the Nginx web server
sudo apt-get install -y nginx

# Start the Nginx service and enable it to run on boot
sudo systemctl start nginx
sudo systemctl enable nginx
```

After this, Nginx will be running and serving files from the `/var/www/html` directory on the Pi by default.

---

### Stage 3: Create a Deployment Script

To deploy to many Pis easily, you should use a script. The script will package your built application, copy it to a Pi, and install it.

Here is an example deployment script. You can save this as `deploy.sh` on your development machine.

#### `deploy.sh`
```bash
#!/bin/bash

# --- Configuration ---
# An array of your Raspberry Pi IP addresses
PI_IPS=("192.168.1.101" "192.168.1.102" "192.168.1.103")
# The username for SSH access on the Pis
PI_USER="pi"
# --- End Configuration ---


# 1. Build the React application
echo "Building the application..."
npm run build
if [ $? -ne 0 ]; then
    echo "Build failed. Aborting deployment."
    exit 1
fi

# 2. Package the build artifacts into a .tar.gz file
echo "Packaging the build directory..."
tar -czvf dta-app.tar.gz dist/


# 3. Loop through each Pi and deploy
for PI_IP in "${PI_IPS[@]}"
do
    echo "----------------------------------------------------"
    echo "Deploying to Raspberry Pi at $PI_IP..."
    echo "----------------------------------------------------"

    # 3a. Use scp to copy the package to the Pi
    echo "--> Transferring package..."
    scp dta-app.tar.gz ${PI_USER}@${PI_IP}:~/
    if [ $? -ne 0 ]; then
        echo "--> FAILED to transfer package to $PI_IP. Skipping."
        continue
    fi

    # 3b. Use ssh to run the installation commands on the Pi
    echo "--> Connecting via SSH to install..."
    ssh ${PI_USER}@${PI_IP} << 'ENDSSH'
        # Clear the old application files
        sudo rm -rf /var/www/html/*

        # Unpack the new application files into the Nginx web root
        sudo tar -xzvf ~/dta-app.tar.gz -C /var/www/html/ --strip-components=1

        # Remove the uploaded package to save space
        rm ~/dta-app.tar.gz

        echo "--> Installation on this Pi is complete."
ENDSSH

    echo "--> Deployment to $PI_IP finished."
done

# 4. Clean up the local package file
echo "----------------------------------------------------"
echo "Cleaning up local package file..."
rm dta-app.tar.gz
echo "Deployment process complete."
```

#### How to Use the Script:

1.  **Save the code:** Save the script above as `deploy.sh` on your development machine.
2.  **Configure IPs:** Edit the `PI_IPS` array in the script to include the IP addresses of all your Raspberry Pis.
3.  **Make it executable:** Run `chmod +x deploy.sh` in your terminal.
4.  **Run it:** Execute `./deploy.sh` to deploy the application to all configured Pis.

This script will automatically build, package, and roll out the latest version of your application to every device in the list.

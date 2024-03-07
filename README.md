# DTA

### 1. Clone the project

```bash
$ git clone https://github.com/digitaltableadvertising/DTA-Main.git
```

### 2. Install yarn packages

```bash
$ yarn install
```

### 3. Set up environments

#### - Rename .env.example to .env

#### - Set values
| Variable name                 | Description                               | Default value
| ---                           | ---                                       | ---
| VITE_DEBUG_MODE               | true: dev, false: prod                    | false
| VITE_API_BASE_URL             | Wordpress REST API                        | https://app.digitaltableadvertising.com/wp-json/dta/v1
| VITE_SCREEN_ID                | Screen of device which run this build     | 00000002
| VITE_MASTER_MEASUREMENT_ID    | Measurement id for google analytics 4     | G-K1RRDV446K

### 4. Build the project

```bash
$ yarn build
```

### 5. Transfer 'dist' directory from your local to device(/home/pi) after rename 'DTA'

### 6. Connect to device via SSH

```bash
$ ssh [username]@[ip address]
```

### 7. Move DTA directory to /var/www/html

```bash
$ mv DTA /var/www/html
```

### 8. Change lighttpd service's document root

#### - Open lighttpd.conf file

```bash
sudo nano /etc/lighttpd/lighttpd.conf
```

#### - Change document root same as following:

`server.document-root = "/var/www/html/DTA"`

### 9. Disable screen turns off

#### - Open lightdm.conf file

```bash
sudo nano /etc/lightdm/lightdm.conf
```

#### - Configure xserver-command

`xserver-command=X -s 0 -dpms`

### 10. Change startup page at fullpageos.txt

#### - Open fullpageos.txt file

```bash
sudo nano /boot/fullpageos.txt
```

#### - Change url

`http://localhost`

### 11. Reboot device

```bash
sudo reboot
```
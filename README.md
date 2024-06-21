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
| VITE_API_BASE_URL             | AWS Lambda API                            | https://api2.digitaltableadvertising.com
| VITE_SCREEN_ID                | Screen of device which run this build     | 99999998
| VITE_MASTER_MEASUREMENT_ID    | Measurement id for google analytics 4     | G-K1RRDV446K

### 4. Build the project

```bash
$ yarn build
```

### 5. Transfer 'dist' directory from your local to device(/home/pi) after rename 'DTA'

### 6. Transfer 'clear_chromium_localstorage.service' and 'clear_chromium_localstorage.sh' files from your local to device(/home/pi)

### 7. Connect to device via SSH

```bash
$ ssh [username]@[ip address]
```

### 8. Move 'DTA' directory to /var/www/html/

```bash
$ sudo mv DTA /var/www/html/
```

### 9. Change lighttpd service's document root

#### - Open lighttpd.conf file

```bash
$ sudo nano /etc/lighttpd/lighttpd.conf
```

#### - Change document root same as following:

`server.document-root = "/var/www/html/DTA"`

### 10. Disable screen turns off

#### - Open lightdm.conf file

```bash
$ sudo nano /etc/lightdm/lightdm.conf
```

#### - Configure xserver-command

`xserver-command=X -s 0 -dpms`

### 11. Change startup page at fullpageos.txt

#### - Open fullpageos.txt file

```bash
$ sudo nano /boot/fullpageos.txt
```

#### - Change url

`http://localhost/`

### 12. Disable chromium browser extensions for google analytics

#### - Open start_chromium_browser file

```bash
$ sudo nano ~/scripts/start_chromium_browser
```

#### - Add --disable-extensions flag to chromium-browser command at the following two lines

```chromium-browser --disable-extensions --kiosk --touch-events...```

```chromium-browser --disable-extensions --enable-logging --log-level...```

### 13. Set up service to clear localstorage when OS booting

#### - Move 'clear_chromium_localstorage.service' file to /etc/systemd/system/

```bash
$ sudo mv clear_chromium_localstorage.service /etc/systemd/system/
```

#### - Reload systemctl daemon

```bash
$ sudo systemctl daemon-reload
```

### - Enable clear_chromium_localstorage.service

```bash
$ sudo systemctl enable clear_chromium_localstorage.service
```

### - Start clear_chromium_localstorage.service

```bash
$ sudo systemctl start clear_chromium_localstorage.service
```

### 14. Reboot device

```bash
$ sudo reboot
```

# Mock FTP server

A small (only 10MB) docker image based on Alpine Linux with a ready to use FTP
server. The configuration is keep simplest as possible and the container is not
intended to the production, but only to testing purpose.

It is configured to grant the access to a single user with read only permissions.

## Environment variables

This image use the following environment variables to configure the login
credentials:

* `FTP_USER`: username for the FTP account (default: `user`)
* `FTP_PASS`: password for the FTP account (default: `password`)
* `FTP_WRITE_ENABLE`: set to `NO` (default) to make the FTP read only, set to
  `YES` to enable write permissions

## Ports and volumes

The image exposes ports 20, 21 and from 21100 to 21110. It also exposes a
volume `/var/ftp` which contains the served files.

The owner user id and group id are both equal to 1000.

set -eu

addgroup -g 1000 -S $FTP_USER
adduser -u 1000 -D -G $FTP_USER -h /var/ftp -s /bin/false $FTP_USER
echo "$FTP_USER:$FTP_PASS" | chpasswd >& /dev/null

touch /var/log/vsftpd.log
tail -f /var/log/vsftpd.log >> /dev/stdout &
vsftpd -owrite_enable=${FTP_WRITE_ENABLE} /etc/vsftpd/vsftpd.conf

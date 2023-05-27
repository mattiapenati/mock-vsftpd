FROM alpine:3.18

ENV FTP_USER=user
ENV FTP_PASS=password

RUN set -eux; \
    apk update; \
    apk --no-cache add vsftpd

COPY vsftpd.conf /etc/vsftpd/vsftpd.conf
COPY run-vsftpd.sh /usr/sbin/

EXPOSE 20-21 21100-21110
VOLUME /var/ftp

ENTRYPOINT ["/bin/sh"]
CMD ["/usr/sbin/run-vsftpd.sh"]

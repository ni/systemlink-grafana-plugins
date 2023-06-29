FROM busybox:stable

COPY ./dist plugin

ENTRYPOINT ["cp", "-r", "plugin"]
CMD ["/var/lib/grafana/plugins"]
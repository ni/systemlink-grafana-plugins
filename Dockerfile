FROM busybox:stable

COPY dist ni-systemlink-app

ENTRYPOINT ["cp", "-R", "ni-systemlink-app"]
CMD ["/var/lib/grafana/plugins"]
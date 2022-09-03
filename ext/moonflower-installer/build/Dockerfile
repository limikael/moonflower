FROM alpine:latest

RUN apk --no-cache add alpine-sdk coreutils make sudo webkit2gtk-dev
RUN adduser -G abuild -g "Alpine Package Builder" -s /bin/ash -D builder
RUN echo "builder ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

RUN mkdir -p /pkg

USER builder

WORKDIR /pkg/build

CMD abuild 
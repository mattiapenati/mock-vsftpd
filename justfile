image := "mock-vsftpd"

build:
    docker build -t {{image}} .

run: build
    docker run -it --rm -v {{invocation_directory()}}/data:/var/ftp:ro -p 20-21:20-21 -p 21100-21110:21100-21110 {{image}}

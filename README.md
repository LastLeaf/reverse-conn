# reverse-conn

A small tool helping you go inside a protected or NAT network from other networks.

# WTF?

Imaging you are in awful network like me:

* My lab is in a protected network.
* My home is in a WIFI network (using NAT).
* Sometimes, I need to visit my lab machines in my home!
* I have a small server (VPS). It can be visited by all machines, but it cannot connect as a TCP client.

The solution:

* Always keep live TCP connections between a lab machine and my VPS (requested from lab).
* When a TCP request is sent to a specified port to VPS, VPS forward it to the lab through a live connection.
* Then the lab machine forward it to a specified destination in lab network.

In this way, visiting VPS with specified port, is just like visiting the specified destination (address with port) in lab network.
The destination can be simply a proxy server, SSH server, or any other TCP services.

# How to Use

Clone this code. Write an `config.json`. There is a sample.

```json
{
	"password": "password",
	"timeout": 20000,
	"pubServerAddr": "127.0.0.1",
	"pubClientPort": 1100,
	"pubRedirectorPort": 1101,
	"redirectAddr": "127.0.0.1",
	"redirectPort": "80"
}
```

* `password` (should be strong) is used for authorize between redirector (lab machine) and pub server (VPS).
* `pubServerAddr` is the address for public server.
* `pubClientPort` is the port for clients.
* `pubRedirectorPort` is the port for redirector.
* `redirectAddr` and `redirectPort` specifies the destination service.

For example, if you want to connect to SSH service in 192.168.1.100 from outer network:

* `redirectAddr` and `redirectPort` should be "192.168.1.100" and 22 (the SSH port).
* `pubServerAddr` is the IP of pub server, e.g. "1.2.3.4".
* `pubClientPort` is 1100 (or another port you like).
* Then run "ssh -p 1100 1.2.3.4" in other machines will logged in to the SSH service.

# Auth?

The code does not care auth at all. You SHOULD set up firewalls or use auth in destination service!

# LICENSE

MIT

# Advanced Usage

For the most obvious use cases, you probably don't need this stuff. But these are the things you might find useful
when things get... _interesting_.

## Compatible Libraries

Compatible servers or clients can be created in other languages. The implementation simply needs to
read and write compatible messages using a unix domain socket. (Server implementations must also 
establish the socket).

The details of the message are determined by the transcoder.

### Message Format: JSON Decoder

The default transcoder writes messages encoded as a JSON string. The message structure is as follows.
```
{
  "topic": string,
  "message": *
}
```

The message is serialized as a string terminated by a two null-byte (`\0`) characters. For example,
a message with the `'hello` as its topic and `world` as its message would be put on the line as:

```
{"topic":"hello","message":"world"}\0\0
```

## Custom Encoding and Decoding

## Throttling Messages
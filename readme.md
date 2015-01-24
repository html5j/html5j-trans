# html5j-trans

2015/1/25のHTML5 conference で、英語 => 日本語翻訳Tweet表示用に作ったWebアプリ

## how to install
```
$ npm install
$ cd conf
$ cp twitter.conf.smpl twitter.conf
// edit twitter.conf
```

## twitter.conf

Create twitter.conf form twitter.conf.smpl for your setting!
```
$ cat conf/twitter.conf.smpl
{ "track" : "#nowplaying",
  "keys": { 
    "consumer_key": "xx",
    "consumer_secret": "xx",
    "access_token_key": "xx",
    "access_token_secret": "xx"
  }
}
```

* track
  * track keyword

belows will be obrained from https://apps.twitter.com/

* keys.consumer_key
* keys.consumer_secret
* keys.access_token_key 
* keys.access_token_secret 

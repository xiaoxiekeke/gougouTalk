'use strict'
var baseconfig={
  rap:'http://rap.taobao.org/mockjs/9797/',
  local:'http://localhost:8084/',
  localIniOS:'http://192.168.66.224:1234/',
  prod:'http://gougou.xiaoxiekeke.com/'
}
module.exports={
  header:{
    method:'POST',
    headers:{
      'Accept':'application/json',
      'Content-Type':'application/json'
    }
  },
  api:{
    base:baseconfig.prod,
    creations:'api/creations',
    comments:'api/comments',
    up:'api/up',
    video:'api/creations/video',
    audio:'api/creations/audio',
    update:'api/u/update',
    signature:'api/signature',
    signup:'api/u/signup',
    verify:'api/u/verify'
  },
  backup:{
    avatar:'http://wx4.sinaimg.cn/thumb150/006QWf2Oly1fix4p74xa9j30j60j6ta2.jpg'
  },
  qiniu:{
    upload:'http://upload.qiniu.com',
    video_domain:'http://gougouvideo.xiaoxiekeke.com/',
    avatar:'http://p2znp5dtk.bkt.clouddn.com/',
    thumb:'http://gougouvideo.xiaoxiekeke.com/',
    video:'http://gougouvideo.xiaoxiekeke.com/'
  },
  cloudinary:{
    cloud_name: 'xiaoke',
    api_key: '257192715654639',
    api_secret: 'YCkXEZjQFCzUgHJIwC1fyIpeGqg',
    base:'http://res.cloudinary.com/xiaoke',
    image:'https://api.cloudinary.com/v1_1/xiaoke/image/upload',
    video:'https://api.cloudinary.com/v1_1/xiaoke/video/upload',
    audio:'https://api.cloudinary.com/v1_1/xiaoke/raw/upload'
  }
}

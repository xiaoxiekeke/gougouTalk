'use strict';
//es6语法
import React,{ Component }from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  AsyncStorage,
  Image,
  ProgressViewIOS,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import * as Progress from 'react-native-progress'
var Button =require('react-native-button').default;
import Icon from 'react-native-vector-icons/Ionicons';
import config from '../common/config';
import request from '../common/request';
var CLOUDINARY = config.cloudinary
var width = Dimensions.get('window').width
var height = Dimensions.get('window').height
var ImagePicker = require('NativeModules').ImagePickerManager;
// import ImagePicker from 'react-native-image-picker'
// var {CountDownText} = require('react-native-sk-countdown');
import {AudioRecorder, AudioUtils} from 'react-native-audio';
var Video =require('react-native-video').default;
var _=require('lodash');
var videoOptions = {
  title: '选择视频',
  cancelButtonTitle:'取消',
  takePhotoButtonTitle:'录制10秒视频',
  chooseFromLibraryButtonTitle:'选择已有视频',
  videoQuality:'medium',
  mediaType:'video',
  durationLimit:10,
  noData:false,
  storageOptions: {
    skipBackup: true,
    path: 'images'
  }
};

var defaultState={
  user:null,

  previewVideo:null,

  title:'',
  modalVisible:false,
  publishing:false,
  willPublish:false,
  publishProgress:.2,

  videoId:null,
  audioId:null,

  //video upload
  video:null,
  videoUploaded:false,
  videoUploading:false,
  videoUploadedProgress:0.01,

  //video loads
  videoProgress:0.01,
  videoTotal:0,
  currentTime:0,

  //count down
  counting:false,
  recording:false,
  lastRecordTime:3,

  //audio
  audio:null,
  audioPath:AudioUtils.DocumentDirectoryPath + '/gougou.aac',
  AudioPlaying:false,
  recordDone:false,
  audioUploaded:false,
  audioUploading:false,
  audioUploadedProgress:0.14, 

  //video player
  rate:1,
  muted:true,
  resizeMode:'contain',
  repeat:false
} 


export default class Edit extends Component {

  // getInitialState() {
  //   var user = this.props.user || {}//空对象
  //   var state = _.clone(defaultState)
  //   state.user=user
  //   return state
  // },
  constructor() {
    super()
    // this._afterLogin = this._afterLogin.bind(this)
    // var user = this.props.user || {}//空对象
    var state = _.clone(defaultState)
    this.state = state

  }

  componentWillMount() {
    var user = this.props.user || {}//空对象
    this.setState({
      user:user
    })
  }

  _pop(){
    this.props.navigator.pop()
  }
  _onLoadStart(){
    console.log('onLoadStart');
  }
  _onLoad(){
    console.log('onLoad');
  }
  _onProgress(data){

    var duration=data.playableDuration
    var currentTime=data.currentTime
    var percent=Number((currentTime / duration).toFixed(2))

    this.setState({
      videoTotal:duration,
      currentTime:Number(currentTime / duration).toFixed(2),
      videoProgress:percent
    })

  }
  _onEnd(){
    if (this.state.recording) {
      //结束音频录制
      AudioRecorder.stopRecording()
      this.setState({
        videoProgress:1,
        recordDone:true,
        recording:false
      });
    };
    console.log('onEnd');
  }
  _onError(e){
    this.setState({
      videoOK:false
    });
  }

  _preview(){//预览视频和音频
    if (this.state.AudioPlaying) {
      //停止音频播放
      AudioRecorder.stopPlaying()
    };
    //音频视频重新开始播放
    this.setState({
      videoProgress:0,
      AudioPlaying:true
    })

    // 启动音频播放
    AudioRecorder.playRecording()
    this.refs.videoPlayer.seek(0)
    
  }

  _record(){//录制
    this.setState({
      videoProgress:0,
      counting:false,
      recordDone:false,
      recording:true
    })
    //开始音频录制
    AudioRecorder.startRecording()
    this.refs.videoPlayer.seek(0)
  }

  _counting(){//启动倒计时
    // 重复点击判断
    if (!this.state.counting&&!this.state.recording&&!this.state.AudioPlaying) {
      this.setState({
        counting:true,
        lastRecordTime:3
      })
      this._startCountDown()
      this.refs.videoPlayer.seek(this.state.videoTotal-0.01)  
    };
  }

  _startCountDown(){
    var that=this
    var countDownInterval=setInterval(function(){
      if (typeof(that.state.lastRecordTime)==="number"&&that.state.lastRecordTime>0) {
        that.setState({
          lastRecordTime:that.state.lastRecordTime-1
        })
      }else if(that.state.lastRecordTime==0){
        that.setState({
          lastRecordTime:'GO'
        })
      }else{
        clearInterval(countDownInterval)
        that.setState({
          counting:false,
          lastRecordTime:3
        })
        that._record()
        console.log("计时结束，开始录制")
      }
    },1000)
  }

  _getToken(body){//兼容七牛和Cloudinary
    // var accessToken=this.state.user.accessToken
    var signatureURL=config.api.base+config.api.signature
    body.accessToken=this.state.user.accessToken
    return request.post(signatureURL,body)
  }
 
  //把视频上传到图床
  _upload(body,type){

    var that = this
    var xhr = new XMLHttpRequest()

    //七牛地址
    var url = config.qiniu.upload

    if (type==='audio') {//如果为audio，则上传到cloudinary
      url=config.cloudinary.video
    };
    xhr.open('POST',url)
    

    var state={}
    state[type+'UploadedProgress']=0
    state[type+'Uploading']=true
    state[type+'Uploaded']=false


    //上传之前设置状态
    this.setState(state)

    xhr.onload = () => {

      if (xhr.status!==200) {
        Alert.alert('请求失败2')
        return
      }
      if (!xhr.responseText) {
        Alert.alert('请求失败')
        return
      }
      var response
      try {
        response=JSON.parse(xhr.response)
      }
      catch(e){
        console.log(e)
        console.log('parse fails')
      }
      if(response){
        var newState={}
        newState[type]=response
        newState[type+'Uploading']=false
        newState[type+'Uploaded']=true
        //上传之后设置状态
        that.setState(newState)

        var updateURL=config.api.base+config.api[type]
        var accessToken=this.state.user.accessToken

        var updateBody={
          accessToken:accessToken
        }
        updateBody[type]=response

        if (type==='audio') {
          updateBody.videoId=that.state.videoId
        };

        request.post(updateURL,updateBody)
        .catch((err)=>{
          if (type==='video') {
            Alert.alert('视频同步出错，请重新上传！')  
          }else if(type==='audio'){
            Alert.alert('音频同步出错，请重新上传！')  
          }
        })
        .then((data)=>{
          if (data&&data.success) {
            var mediaState={}
            mediaState[type+'Id']=data.data
            if (type==='audio') {
              that._showModal()
              mediaState.willPublish=true
            }
            that.setState(mediaState)
          }
        })
      }

    }

    //设置上传进度
    if(xhr.upload){
      xhr.upload.onprogress=(event) =>{
        if(event.lengthComputable){
          var percent=Number((event.loaded/event.total).toFixed(2))
          var progressState={}
          progressState[type+'UploadedProgress']=percent
          that.setState(progressState)
        }
      }
    }
    xhr.send(body)
  }



  _initAudio(){

    var audioPath = this.state.audioPath;
    console.log('audioPath:'+audioPath)
    AudioRecorder.prepareRecordingAtPath(audioPath,{
      SampleRate:22050,
      Channels:1,
      AudioQuality:'Low',
      AudioEncoding:'aac'
    });
    AudioRecorder.onProgress = (data) => {
      this.setState({currentTime: Math.floor(data.currentTime)});
    };
    AudioRecorder.onFinished = (data) => {
      this.setState({finished: data.finished});
      console.log(`Finished recording: ${data.finished}`);
    };
  }

  _uploadAudio(){
    var that=this
    var tags='app,audio'
    var folder='audio'
    var timestamp=Date.now()

    this._getToken({
      type:'audio',
      cloud:'cloudinary',
      timestamp:timestamp
    })
    .catch((err) => {
      console.log(err);
    })
    .then((data)=>{
      console.log('正确：')
      console.log(data)
      if (data && data.success) {
        //从后台拿到生成好的签名
        var signature=data.data.token
        var key=data.data.key
        var body = new FormData()
        body.append('signature', signature)
        body.append('folder', folder)
        body.append('tags', tags)
        body.append('timestamp', timestamp)
        body.append('api_key', CLOUDINARY.api_key)
        body.append('resource_type', 'video')
        body.append('file', {
          type:'video/mp4',
          uri:that.state.audioPath,
          name:key
        })
        that._upload(body,'audio')
      }
    })
  }

  _closeModal(){
    this.setState({
      modalVisible:false
    })
  }

  _showModal(){
    this.setState({
      modalVisible:true
    })
  }

  componentDidMount(){
    var that=this

    AsyncStorage.getItem('user')
    .then((data)=>{
      var user
      if (data) {
        user=JSON.parse(data)
      }
      if (user && user.accessToken) {
        that.setState({
          user:user
        })
      }
    })
    this._initAudio()
  }

  _pickVideo(){
    var that =this
    ImagePicker.showImagePicker(videoOptions, (res) => {

      if (res.didCancel) {
        return
      }

      var state=_.clone(defaultState)
      var uri=res.uri
      state.previewVideo=res.uri
      state.user=this.state.user

      that.setState(state)

      that._getToken({
        type:'video',
        cloud:'qiniu'
      })
      .catch((err)=>{
        console.log(err)
        Alert.alert('上传出错')
      })
      .then(function(data){
        console.log(data)
        if (data && data.success) {
          //从后台拿到生成好的签名
          var token=data.data.token
          var key=data.data.key
          var body = new FormData()
          body.append('token', token)
          body.append('resource_type', 'image')
          body.append('key',key)
          body.append('file', {
            type:'video/mp4',
            uri:uri,
            key:key
          })
          that._upload(body,'video')
        }
      })
    });
  }

  _submit(){
    var that=this
    var body={
      title:this.state.title,
      videoId:this.state.videoId,
      audioId:this.state.audioId
    }

    var creationURL=config.api.base+config.api.creations
    var user=this.state.user
    if (user&&user.accessToken) {
      body.accessToken=user.accessToken
      this.setState({
        publishing:true
      })
      request.post(creationURL,body)
             .catch(function(err){
                console.log(err)
                Alert.alert('视频发布失败')
             })
             .then(function(data){
                if (data&&data.success) {
                  console.log(data)
                  that._closeModal()
                  var state=_.clone(defaultState)
                  that.setState(state)
                  var interval=setInterval(function(){
                    if (!that.state.modalVisible) {
                      Alert.alert('视频发布成功')
                      clearInterval(interval) 
                    }
                  },1000)
                }else{
                  that.setState({
                    publishing:false
                  })
                  Alert.alert('视频发布失败')
                }
              })
    }     
  }

  render(){
    return (
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <Text style={styles.toolbarTitle}>
          {this.state.previewVideo?'点击按钮配音':'理解狗狗，从配音开始'}
          </Text>
          {
            this.state.previewVideo&&this.state.videoUploaded
            ?<Text style={styles.toolbarExtra} onPress={()=>this._pickVideo()}>更换视频</Text>  
            :null
          }
        </View>
        
        <View style={styles.page}>

          {
            this.state.previewVideo
            ? <View style={styles.videoContainer}>
                <View style={styles.videoBox}>
                  <Video
                    ref='videoPlayer'
                    source={{uri:this.state.previewVideo}}
                    style={styles.video}
                    volume={20}
                    paused={this.state.paused}
                    rate={this.state.rate}
                    muted={this.state.muted}
                    resizeMode={this.state.resizeMode}
                    repeat={this.state.repeat}
                    onLoadStart={()=>this._onLoadStart()}
                    onLoad={()=>this._onLoad()}
                    onProgress={(data)=>this._onProgress(data)}
                    onEnd={()=>this._onEnd()}
                    onError={()=>this._onError()} />
                    {//上传视频的进度条
                      !this.state.videoUploaded&&this.state.videoUploading
                      ?
                      <View style={styles.progressTipBox} >
                        <Progress.Bar style={styles.progressBar} color={'#ee735c'}  progress={this.state.videoUploadedProgress}  width={5} />  
                        <Text style={styles.progressTip}>
                          正在生成静音视频,已完成{(this.state.videoUploadedProgress*100).toFixed(2)}%
                        </Text>
                      </View>:null
                    }
                    {//录制声音的进度条
                      this.state.recording||this.state.AudioPlaying?
                      <View style={styles.progressTipBox} >
                        <Progress.Bar style={styles.progressBar} color={'#ee735c'}  progress={this.state.videoProgress}  width={5} />    
                          {
                            this.state.recording?
                            <Text style={styles.progressTip}>
                              正在录制声音中
                            </Text>:null
                          }
                      </View>:null
                    }
                    {//声音录制完成后展示预览按钮
                      this.state.recordDone?
                      <View style={styles.previewBox}>
                        <Icon name='ios-play' style={styles.previewIcon} />
                        <Text style={styles.previewText} onPress={()=>this._preview()}>预览</Text>
                      </View>
                      :null
                    }
                </View>
              </View>
            :<TouchableOpacity style={styles.uploadContainer} onPress={()=>this._pickVideo()}>
              <View style={styles.uploadBox}>
                <Image source={require('../assets/images/record.png')} style={styles.uploadIcon} />
                <Text style={styles.uploadTitle}>点我上传视频</Text>
                <Text style={styles.uploadDesc}>建议时长不超过 20 秒</Text>
              </View>
            </TouchableOpacity>
          }

          {
            this.state.videoUploaded?
            <View style={styles.recordBox}>
              <View style={[styles.recordIconBox,(this.state.recording||this.state.AudioPlaying)&&styles.recordOn]}>
              {
                this.state.counting&&!this.state.recording
                ?
                <Button
                  style={styles.countBtn}>
                  {this.state.lastRecordTime}
                </Button>
                :
                <TouchableOpacity onPress={()=>this._counting()}>
                  <Icon name='ios-mic' style={styles.recordIcon}>
                  </Icon>
                </TouchableOpacity>
              }
                
              </View>  
            </View>:null
          }

          {
            this.state.videoUploaded&&this.state.recordDone?
            <View style={styles.uploadAudioBox}>
              {
                !this.state.audioUploaded&&!this.state.audioUploading?
                <Text style={styles.uploadAudioText} onPress={()=>this._uploadAudio()}>下一步</Text>:null
              }
              {
                this.state.audioUploading?
                <Progress.Circle
                  size={60}
                  showsText={true}
                  color={'#ee735c'}
                  progress={this.state.audioUploadedProgress} />:null
              }
              
            </View>:null            
          }

        </View>

        <Modal animationType="fade"
          visible={this.state.modalVisible}
          onRequestClose={() => {console.log("the modal has been closed")}}
          >
          <View style={styles.modalContainer}>
            <Icon
              name='ios-close-outline'
              style={styles.closeIcon}
              onPress={()=>this._closeModal()} />
            {
              this.state.audioUploaded && !this.state.publishing?
              <View>
                <TextInput 
                  placeholder={'给狗狗一句宣言吧'}
                  style={styles.inputField}
                  autoCapitalize={'none'}
                  autoCorrect={false}
                  defaultValue={this.state.title}
                  onChangeText={(text)=>{
                    this.setState({
                      title:text
                    })
                  }}/>
              </View>:null  
            }
            {
              this.state.publishing?
              <View style={styles.loadingBox}>
                <Text style={styles.loadingText}>耐心等一下，拼命为您生成专属视频中...</Text>
                {
                  this.state.willPublish?
                  <Text style={styles.loadingText}>正在合并视频音频...</Text>:null  
                }
                {
                  this.state.publishProgress>0.3?
                  <Text style={styles.loadingText}>开始上传喽！</Text>:null
                }
                <Progress.Circle
                    size={60}
                    showsText={true}
                    color={'#ee735c'}
                    progress={this.state.publishProgress} />
              </View>:null
            }
              <View style={styles.submitBox}>
                {
                  this.state.audioUploaded&&!this.state.publishing?
                  <Button
                    style={styles.btn}
                    onPress={()=>this._submit()}>发布视频</Button>:null
                }  
              </View> 
          </View>
        </Modal>
      </View>
    )
  }
};



//es5语法
var styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar:{
    flexDirection:'row',
    paddingTop:35,
    paddingBottom:12,
    backgroundColor:'#ee735c',
    width: width
  },
  toolbarTitle:{
    flex:1,
    fontSize:16,
    color:'#fff',
    textAlign:'center',
    fontWeight:'600'
  },
  toolbarExtra:{
    position:'absolute',
    right:10,
    top:26,
    color:'#fff',
    textAlign:'right',
    fontWeight:'600',
    fontSize:14
  },

  page: {
    flex: 1,
    alignItems: 'center',
  },

  uploadContainer: {
    marginTop: 90,
    width: width - 40,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: '#ee735c',
    justifyContent: 'center',
    borderRadius: 6,
    height:200,
    backgroundColor: '#fff'
  },

  uploadTitle: {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 16,
    color: '#000'
  },

  uploadDesc: {
    color: '#999',
    textAlign: 'center',
    fontSize: 12
  },

  uploadIcon: {
    width: 110,
    resizeMode: 'contain'
  },

  uploadBox: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },

  videoContainer: {
    width: width,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },

  videoBox: {
    width: width,
    height: height * 0.6
  },

  video: {
    width: width,
    height: height * 0.6,
    backgroundColor: '#333'
  },

  progressTipBox: {
    width: width,
    height: 30,
    backgroundColor: 'rgba(244,244,244,0.65)'
  },

  progressTip: {
    color: '#333',
    width: width - 10,
    padding: 5
  },

  progressBar: {
    width: width
  },

  recordBox: {
    width: width,
    height: 60,
    alignItems: 'center'
  },

  recordIconBox: {
    width: 68,
    height: 68,
    marginTop: -30,
    borderRadius: 34,
    backgroundColor: '#ee735c',
    borderWidth: 1,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },

  recordIcon: {
    fontSize: 58,
    backgroundColor: 'transparent',
    color: '#fff'
  },

  countBtn: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff'
  },

  recordOn: {
    backgroundColor: '#ccc'
  },

  previewBox: {
    width: 80,
    height: 30,
    position: 'absolute',
    right: 10,
    bottom: 10,
    borderWidth: 1,
    borderColor: '#ee735c',
    borderRadius: 3,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },

  previewIcon: {
    marginRight: 5,
    fontSize: 20,
    color: '#ee735c',
    backgroundColor: 'transparent'
  },

  previewText: {
    fontSize: 20,
    color: '#ee735c',
    backgroundColor: 'transparent'
  },

  uploadAudioBox: {
    width: width,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },

  uploadAudioText: {
    width: width - 20,
    padding: 5,
    borderWidth: 1,
    borderColor: '#ee735c',
    borderRadius: 5,
    textAlign: 'center',
    fontSize: 30,
    color: '#ee735c'
  },

  modalContainer: {
    width: width,
    height: height,
    paddingTop: 50,
    backgroundColor: '#fff'
  },

  closeIcon: {
    position: 'absolute',
    fontSize: 32,
    right: 20,
    top: 30,
    color: '#ee735c'
  },

  loadingBox: {
    width: width,
    height: 50,
    marginTop: 10,
    padding: 15,
    alignItems: 'center'
  },

  loadingText: {
    marginBottom: 10,
    textAlign: 'center',
    color: '#333'
  },

  fieldBox: {
    width: width - 40,
    height: 36,
    marginTop: 30,
    marginLeft: 20,
    marginRight: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },

  inputField: {
    height: 36,
    textAlign: 'center',
    color: '#666',
    fontSize: 14
  },

  submitBox: {
    marginTop: 50,
    padding: 15
  },

  btn: {
    marginTop: 65,
    padding: 10,
    marginLeft: 10,
    marginRight: 10,
    backgroundColor: 'transparent',
    borderColor: '#ee735c',
    borderWidth: 1,
    borderRadius: 4,
    color: '#ee735c'
  }

});



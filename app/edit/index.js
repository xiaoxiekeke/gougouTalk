/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

// ES5
var _ = require('lodash')
var React = require('react-native')
var Icon = require('react-native-vector-icons/Ionicons')
var Video = require('react-native-video').default
var ImagePicker = require('NativeModules').ImagePickerManager
var CountDown = require('react-native-sk-countdown').CountDownText
var RNAudio = require('react-native-audio')
var Progress = require('react-native-progress')
var Button = require('react-native-button')

var AudioRecorder = RNAudio.AudioRecorder
var AudioUtils = RNAudio.AudioUtils

var StyleSheet = React.StyleSheet
var Text = React.Text
var View = React.View
var Image = React.Image
var AlertIOS = React.AlertIOS
var Dimensions = React.Dimensions
var AsyncStorage = React.AsyncStorage
var ProgressViewIOS = React.ProgressViewIOS
var TouchableOpacity = React.TouchableOpacity
var Modal = React.Modal
var TextInput = React.TextInput

var request = require('../common/request')
var config = require('../common/config')

var width = Dimensions.get('window').width
var height = Dimensions.get('window').height


var videoOptions = {
  title: '选择视频',
  cancelButtonTitle: '取消',
  takePhotoButtonTitle: '录制 10 秒视频',
  chooseFromLibraryButtonTitle: '选择已有视频',
  videoQuality: 'medium',
  mediaType: 'video',
  durationLimit: 10,
  noData: false,
  storageOptions: { 
    skipBackup: true, 
    path: 'images'
  }
}

var defaultState = {
  previewVideo: null,

  videoId: null,
  audioId: null,

  title: '',
  modalVisible: false,
  publishing: false,
  willPublish: false,
  publishProgress: 0.2,

  // video upload
  video: null,
  videoUploaded: false,
  videoUploading: false,
  videoUploadedProgress: 0.14,

  // video loads
  videoProgress: 0.01,
  videoTotal: 0,
  currentTime: 0,

  // count down
  counting: false,
  recording: false,

  // audio
  audio: null,
  audioPlaying: false,
  recordDone: false,
  audioPath: AudioUtils.DocumentDirectoryPath + '/gougou.aac',

  audioUploaded: false,
  audioUploading: false,
  audioUploadedProgress: 0.14,

  // video player
  rate: 1,
  muted: true,
  resizeMode: 'contain',
  repeat: false
}

var Edit = React.createClass({
  getInitialState() {
    var user = this.props.user || {}
    var state = _.clone(defaultState)

    state.user = user

    return state
  },

  _onLoadStart() {
    console.log('load start')
  },

  _onLoad() {
    console.log('loads')
  },

  _onProgress(data) {
    var duration = data.playableDuration
    var currentTime = data.currentTime
    var percent = Number((currentTime / duration).toFixed(2))
    
    this.setState({
      videoTotal: duration,
      currentTime: Number(data.currentTime.toFixed(2)),
      videoProgress: percent
    })
  },

  _onEnd() {
    if (this.state.recording) {
      AudioRecorder.stopRecording()

      this.setState({
        videoProgress: 1,
        recordDone: true,
        recording: false
      })
    }
  },

  _onError(e) {
    this.setState({
      videoOk: false
    })
  },

  _preview() {
    if (this.state.audioPlaying) {
      AudioRecorder.stopPlaying()
    }

    this.setState({
      videoProgress: 0,
      audioPlaying: true
    })

    AudioRecorder.playRecording()
    this.refs.videoPlayer.seek(0)
  },

  _record() {
    this.setState({
      videoProgress: 0,
      counting: false,
      recordDone: false,
      recording: true
    })

    AudioRecorder.startRecording()
    this.refs.videoPlayer.seek(0)
  },

  _counting() {
    if (!this.state.counting && !this.state.recording && !this.state.audioPlaying) {
      this.setState({
        counting: true
      })

      this.refs.videoPlayer.seek(this.state.videoTotal - 0.01)
    }
  },

  _getToken(body) {
    var signatureURL = config.api.base + config.api.signature

    body.accessToken = this.state.user.accessToken

    return request.post(signatureURL, body)
  },

  _upload(body, type) {
    var that = this
    var xhr = new XMLHttpRequest()
    var url = config.qiniu.upload

    if (type === 'audio') {
      url = config.cloudinary.video
    }

    var state = {}

    state[type + 'UploadedProgress'] = 0
    state[type + 'Uploading'] = true
    state[type + 'Uploaded'] = false

    this.setState(state)

    xhr.open('POST', url)
    xhr.onload = () => {
      if (xhr.status !== 200) {
        AlertIOS.alert('请求失败')
        console.log(xhr.responseText)

        return
      }

      if (!xhr.responseText) {
        AlertIOS.alert('请求失败')

        return
      }

      var response

      try {
        response = JSON.parse(xhr.response)
      }
      catch (e) {
        console.log(e)
        console.log('parse fails')
      }

      console.log(response)

      if (response) {
        var newState = {}
        newState[type] = response
        newState[type + 'Uploading'] = false
        newState[type + 'Uploaded'] = true

        that.setState(newState)

        var updateURL = config.api.base + config.api[type]
        var accessToken = this.state.user.accessToken
        var updateBody = {
          accessToken: accessToken
        }

        updateBody[type] = response

        if (type === 'audio') {
          updateBody.videoId = that.state.videoId
        }

        request
          .post(updateURL, updateBody)
          .catch((err) => {
            console.log(err)
            if (type === 'video') {
              AlertIOS.alert('视频同步出错，请重新上传！')
            }
            else if (type === 'audio') {
              AlertIOS.alert('音频同步出错，请重新上传！')
            }
          })
          .then((data) => {
            if (data && data.success) {
              var mediaState = {}

              mediaState[type + 'Id'] = data.data

              if (type === 'audio') {
                that._showModal()
                mediaState.willPublish = true
              }

              that.setState(mediaState)
            }
            else {
              if (type === 'video') {
                AlertIOS.alert('视频同步出错，请重新上传！')
              }
              else if (type === 'audio') {
                AlertIOS.alert('音频同步出错，请重新上传！')
              }
            }
          })
      }
    }

    if (xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          var percent = Number((event.loaded / event.total).toFixed(2))
          var progressState = {}

          progressState[type + 'UploadedProgress'] = percent
          that.setState(progressState)
        }
      }
    }

    xhr.send(body)
  },

  _pickVideo() {
    var that = this

    ImagePicker.showImagePicker(videoOptions, (res) => {
      if (res.didCancel) {
        return
      }

      var state = _.clone(defaultState)
      var uri = res.uri

      state.previewVideo = uri
      state.user = this.state.user
      that.setState(state)

      that._getToken({
        type: 'video',
        cloud: 'qiniu'
      })
      .catch((err) => {
        console.log(err)
        AlertIOS.alert('上传出错')
      })
        .then((data) => {
          if (data && data.success) {
            console.log(data)
            var token = data.data.token
            var key = data.data.key
            var body = new FormData()

            body.append('token', token)
            body.append('key', key)
            body.append('file', {
              type: 'video/mp4',
              uri: uri,
              name: key
            })

            that._upload(body, 'video')
          }
        })
    })
  },

  _uploadAudio() {
    var that = this
    var tags = 'app,audio'
    var folder = 'audio'
    var timestamp = Date.now()

    this._getToken({
      type: 'audio',
      timestamp: timestamp,
      cloud: 'cloudinary'
    })
    .catch((err) => {
      console.log(err)
    })
    .then((data) => {
      if (data && data.success) {
        // data.data
        var signature = data.data.token
        var key = data.data.key
        var body = new FormData()

        body.append('folder', folder)
        body.append('signature', signature)
        body.append('tags', tags)
        body.append('timestamp', timestamp)
        body.append('api_key', config.cloudinary.api_key)
        body.append('resource_type', 'video')
        body.append('file', {
          type: 'video/mp4',
          uri: that.state.audioPath,
          name: key
        })

        that._upload(body, 'audio')
      }
    })
  },

  _initAudio() {
    var audioPath = this.state.audioPath

    console.log(audioPath)

    AudioRecorder.prepareRecordingAtPath(audioPath, {
      SampleRate: 22050,
      Channels: 1,
      AudioQuality: 'High',
      AudioEncoding: 'aac'
    })
    
    AudioRecorder.onProgress = (data) => {
      this.setState({
        currentTime: Math.floor(data.currentTime)
      })
    }
    AudioRecorder.onFinished = (data) => {
      this.setState({
        finished: data.finished
      })
      console.log(`Finished recording: ${data.finished}`)
    }
  },

  _closeModal() {
    this.setState({
      modalVisible: false
    })
  },

  _showModal() {
    this.setState({
      modalVisible: true
    })
  },

  componentDidMount() {
    var that = this
    
    AsyncStorage.getItem('user')
      .then((data) => {
        var user

        if (data) {
          user = JSON.parse(data)
        }

        if (user && user.accessToken) {
          that.setState({
            user: user
          })
        }
      })

    this._initAudio()
  },

  _submit() {
    var that = this
    var body = {
      title: this.state.title,
      videoId: this.state.videoId,
      audioId: this.state.audioId
    }

    var creationURL = config.api.base + config.api.creations
    var user = this.state.user

    if (user && user.accessToken) {
      body.accessToken = user.accessToken

      this.setState({
        publishing: true
      })

      request
        .post(creationURL, body)
        .catch((err) => {
          console.log(err)
          AlertIOS.alert('视频发布失败')
        })
        .then((data) => {
          console.log(data)
          if (data && data.success) {
            that._closeModal()
            AlertIOS.alert('视频发布成功')
            var state = _.clone(defaultState)

            that.setState(state)
          }
          else {
            this.setState({
              publishing: false
            })
            AlertIOS.alert('视频发布失败')
          }
        })
    }
  },

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <Text style={styles.toolbarTitle}>
            {this.state.previewVideo ? '点击按钮配音' : '理解狗狗，从配音开始'}
          </Text>
          {
            this.state.previewVideo && this.state.videoUploaded
            ? <Text style={styles.toolbarExtra} onPress={this._pickVideo}>更换视频</Text>
            : null
          }
        </View>

        <View style={styles.page}>
          {
            this.state.previewVideo
            ? <View style={styles.videoContainer}>
                <View style={styles.videoBox}>
                  <Video
                    ref='videoPlayer'
                    source={{uri: this.state.previewVideo}}
                    style={styles.video}
                    volume={5}
                    paused={this.state.paused}
                    rate={this.state.rate}
                    muted={this.state.muted}
                    resizeMode={this.state.resizeMode}
                    repeat={this.state.repeat}

                    onLoadStart={this._onLoadStart}
                    onLoad={this._onLoad}
                    onProgress={this._onProgress}
                    onEnd={this._onEnd}
                    onError={this._onError} />
                  {
                    !this.state.videoUploaded && this.state.videoUploading
                    ? <View style={styles.progressTipBox}>
                        <ProgressViewIOS style={styles.progressBar} progressTintColor='#ee735c' progress={this.state.videoUploadedProgress} />
                        <Text style={styles.progressTip}>
                          正在生成静音视频，已完成{(this.state.videoUploadedProgress * 100).toFixed(2)}%
                        </Text>
                      </View>
                    : null
                  }

                  {
                    this.state.recording || this.state.audioPlaying
                    ? <View style={styles.progressTipBox}>
                        <ProgressViewIOS style={styles.progressBar} progressTintColor='#ee735c' progress={this.state.videoProgress} />
                        {
                          this.state.recording
                          ? <Text style={styles.progressTip}>
                            录制声音中
                            </Text>
                          : null
                        }
                      </View>
                    : null
                  }

                  {
                    this.state.recordDone
                    ? <View style={styles.previewBox}>
                        <Icon name='ios-play' style={styles.previewIcon} />
                        <Text style={styles.previewText} onPress={this._preview}>
                          预览
                        </Text>
                    </View>
                    : null
                  }
                </View>
              </View>
            : <TouchableOpacity style={styles.uploadContainer} onPress={this._pickVideo}>
              <View style={styles.uploadBox}>
                <Image source={require('../assets/images/record.png')} style={styles.uploadIcon} />
                <Text style={styles.uploadTitle}>点我上传视频</Text>
                <Text style={styles.uploadDesc}>建议时长不超过 20 秒</Text>
              </View>
            </TouchableOpacity>
          }

          {
            this.state.videoUploaded
            ? <View style={styles.recordBox}>
                <View style={[styles.recordIconBox, (this.state.recording || this.state.audioPlaying) && styles.recordOn]}>
                  {
                    this.state.counting && !this.state.recording
                    ? <CountDown
                        style={styles.countBtn}
                        countType='seconds' // 计时类型：seconds / date
                        auto={true} // 自动开始
                        afterEnd={this._record} // 结束回调
                        timeLeft={3} // 正向计时 时间起点为0秒
                        step={-1} // 计时步长，以秒为单位，正数则为正计时，负数为倒计时
                        startText='准备录制' // 开始的文本
                        endText='Go' // 结束的文本
                        intervalText={(sec) => {
                          return sec === 0 ? 'Go' : sec
                        }} />
                    : <TouchableOpacity onPress={this._counting}>
                        <Icon name='ios-mic' style={styles.recordIcon} />
                      </TouchableOpacity>
                  }
                </View>
              </View>
            : null
          }

          {
            this.state.videoUploaded && this.state.recordDone
            ? <View style={styles.uploadAudioBox}>
              {
                !this.state.audioUploaded && !this.state.audioUploading
                ? <Text style={styles.uploadAudioText} onPress={this._uploadAudio}>下一步</Text>
                : null
              }

              {
                this.state.audioUploading
                ? <Progress.Circle
                  showsText={true}
                  size={60}
                  color={'#ee735c'}
                  progress={this.state.audioUploadedProgress} />
                : null
              }
              </View>
            : null
          }
        </View>

        <Modal
          animated={false}
          visible={this.state.modalVisible}>
          <View style={styles.modalContainer}>
            <Icon
              name='ios-close-outline'
              onPress={this._closeModal}
              style={styles.closeIcon} />
            {
              this.state.audioUploaded && !this.state.publishing
              ? <View style={styles.fieldBox}>
                  <TextInput
                    placeholder={'给狗狗一句宣言吧'}
                    style={styles.inputField}
                    autoCapitalize={'none'}
                    autoCorrect={false}
                    defaultValue={this.state.title}
                    onChangeText={(text) => {
                      this.setState({
                        title: text
                      })
                    }}
                  />
                </View>
              : null
            }

            {
              this.state.publishing
              ? <View style={styles.loadingBox}>
                  <Text style={styles.loadingText}>耐心等一下，拼命为您生成专属视频中...</Text>
                  {
                    this.state.willPublish
                    ? <Text style={styles.loadingText}>正在合并视频音频...</Text>
                    : null
                  }
                  {
                    this.state.publishProgress > 0.3
                    ? <Text style={styles.loadingText}>开始上传喽！...</Text>
                    : null
                  }
                  <Progress.Circle
                    showsText={true}
                    size={60}
                    color={'#ee735c'}
                    progress={this.state.publishProgress} />
                </View>
              : null
            }

            <View style={styles.submitBox}>
              {
                this.state.audioUploaded && !this.state.publishing
                ? <Button
                  style={styles.btn}
                  onPress={this._submit}>发布视频</Button>
                : null
              }
            </View>
          </View>
        </Modal>
      </View>
    )
  }
})

var styles = StyleSheet.create({
  container: {
    flex: 1
  },

  toolbar: {
    flexDirection: 'row',
    paddingTop: 25,
    paddingBottom: 12,
    backgroundColor: '#ee735c'
  },

  toolbarTitle: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600'
  },

  toolbarExtra: {
    position: 'absolute',
    right: 10,
    top: 26,
    color: '#fff',
    textAlign: 'right',
    fontWeight: '600',
    fontSize: 14
  },

  page: {
    flex: 1,
    alignItems: 'center'
  },

  uploadContainer: {
    marginTop: 90,
    width: width - 40,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: '#ee735c',
    justifyContent: 'center',
    borderRadius: 6,
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
})

module.exports = Edit


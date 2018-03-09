'use strict';
//es6语法
import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Alert,
  NetInfo
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

var Button =require('react-native-button').default;
// var CountDownText =require('react-native-sk-countdown').CountDownText;
// var {CountDownText} = require('react-native-sk-countdown');

import config from '../common/config';
import request from '../common/request';
export default class Login extends Component {
  constructor() {
    super()
    this._sendVerifyCode = this._sendVerifyCode.bind(this)
    this._startCountDown = this._startCountDown.bind(this)
    // this._submit = this._submit.bind(this)
    this.state = {
      phoneNumber:'',
      varifyCode:'',
      codeSent:false,
      countingDone:false,
      lastSecond:30
    }
  }
  _showVerifyCode(){
    this.setState({
      codeSent:true
    })
  }
  _startCountDown(){
    var that=this
    var interval=setInterval(function(){
      if(that.state.countingDone==false&&that.state.lastSecond>0){
        that.setState({
          lastSecond:that.state.lastSecond-1
        })  
      }else{
        clearInterval(interval)
        if(that.state.countingDone==false){
          that.setState({
            countingDone:true
          })  
        }
      }  
    },1000)
  }
  _sendVerifyCode(){
    //发验证码
    var that=this;
    var phoneNumber = this.state.phoneNumber
    
    if(!phoneNumber){
      return Alert.alert('手机号不能为空！')
    }
    
    var body={
      phoneNumber:phoneNumber
    }
    var signupURL =config.api.base + config.api.signup
    console.log(signupURL)
    request.post(signupURL,body)
    .then((data) => {
      if (data&&data.success) {
        that._showVerifyCode()
        this.setState({
          countingDone:false,
          lastSecond:30  
        })
        Alert.alert(data.msg)
        that._startCountDown()
      }else {
        Alert.alert('获取验证码失败，请检查手机号是否正确')
      }
    })
    .catch((err)=>{
      Alert.alert(err)
      Alert.alert('获取验证码失败，请检查网络是否良好')
      that._showVerifyCode()
    })
  }
  _submit(){
    //提交验证码和手机号
    var that=this;
    var phoneNumber = this.state.phoneNumber
    var verifyCode = this.state.verifyCode
    if(!phoneNumber || !verifyCode){
      return Alert.alert('手机号或验证码不能为空！')
    }
    var body={
      phoneNumber:phoneNumber,
      verifyCode:verifyCode
    }
    var verifyURL =config.api.base + config.api.verify
    request.post(verifyURL,body)
    .then((data) => {
      if (data&&data.success) {
        that.setState({
          countingDone:true,
          lastSecond:30  
        })
        that.props.afterLogin(data.data)
      }else {
        Alert.alert('登录失败，请检查手机号是否正确')
      }
    })
    .catch((err)=>{
      console.log(err)
      Alert.alert('登录失败，请检查网络是否良好')
    })
  }
  render(){
    return (
      <View style={styles.container}>
        <View style={styles.signupBox}>
          <Text style={styles.title}>快速登录</Text>
          <TextInput
             placeholder="输入手机号"
             autoCapitalize={'none'}
             autoCorrect={false}
             underlineColorAndroid={'transparent'}
             keyboardType={'number-pad'}
             style={styles.inputField}
             onChangeText={(text)=>{
              this.setState({
                phoneNumber:text
              })
             }}/>
          {
            this.state.codeSent
            ?<View style={styles.verifyCodeBox}>
              <TextInput
                 placeholder="输入验证码"
                 autoCapitalize={'none'}
                 underlineColorAndroid={'transparent'}
                 autoCorrect={false}
                 keyboardType={'number-pad'}
                 style={styles.inputFieldCode}
                 onChangeText={(text)=>{
                  this.setState({
                    verifyCode:text
                  })
                 }}/>
               {
                 this.state.countingDone
                 ?<Button
                   style={styles.countBtn}
                   onPress={this._sendVerifyCode}>获取验证码</Button>
                 :<Button
                   disabled={true}
                   style={styles.countBtnUnable}
                   >剩余秒数：{this.state.lastSecond}</Button>
               }
              </View>
            :null
          }

          {
            this.state.codeSent
              ?<Button
                style={styles.btn}
                onPress={()=>this._submit()}>登录</Button>
              :<Button
                style={styles.btn}
                onPress={this._sendVerifyCode}>获取验证码</Button>
          }

        </View>
      </View>
    )
  }
}

/*<CountDownText
   style={styles.countBtn}
   countType='seconds'
   auto={true}
   afterEnd={this._countingDone}
   timeLeft={60}
   step={-1}
   startText='获取验证码'
   endText='获取验证码'
   intervalText={(sec)=>'剩余秒数:'+sec}/>
*/

//es5语法
var styles = StyleSheet.create({
  container: {
    flex: 1,
    padding:10,
    backgroundColor: '#f9f9f9'
  },
  signupBox:{
    marginTop:30,
  },
  title:{
    marginBottom:20,
    color:'#333',
    fontSize:20,
    textAlign:'center'
  },
  inputField:{
    // flex:1,
    height:40,
    padding:5,
    color:'#666',
    fontSize:16,
    backgroundColor:'#fff',
    borderRadius:4,
    textShadowColor: '#fff'
  },
  inputFieldCode:{
    height:40,
    width: 220,
    padding:5,
    color:'#666',
    fontSize:16,
    backgroundColor:'#fff',
    borderRadius:4
  },
  verifyCodeBox:{
    marginTop:10,
    flexDirection:'row',
    justifyContent:'space-between'
  },
  countBtn:{
    width:110,
    height:40,
    padding:10,
    marginLeft:8,
    color:'#fff',
    backgroundColor:'#ee735c',
    borderColor:'#ee735c',
    textAlign:'left',
    fontSize:15,
    borderRadius:2,
  },
  countBtnUnable:{
    width:120,
    height:40,
    padding:10,
    marginLeft:8,
    color:'#fff',
    backgroundColor:'#ccc',
    borderColor:'#fff',
    textAlign:'left',
    fontSize:15,
    borderRadius:2,
  },
  btn:{
    padding:10,
    margin:10,
    backgroundColor:'transparent',
    borderColor:'#ee735c',
    borderWidth:1,
    borderRadius:4,
    color:'#ee735c'
  }
});

// module.exports=Login;

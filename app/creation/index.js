'use strict';
//es6语法
import React,{ Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ListView,
  TouchableHighlight,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  AsyncStorage,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
// import Mock from 'mockjs';
import config from '../common/config'
import request from '../common/request'
import util from '../common/util'
// import Detail from './Detail'

var width=Dimensions.get('window').width;
var cachedResults = {
  nextPage:1,
  items:[],
  total:0
};


class Item extends Component {

  constructor() {
    super()
    this.state = {
      up:null,
      row:null
    }
  }

  _up(){//点赞
    var up=!this.state.up
    var row=this.state.row
    var url=config.api.base+config.api.up
    var that = this

    var body={
      id:row._id,
      up:up?'yes':'no',
      accessToken:this.props.user.accessToken
    }
    request.post(url,body)
    .then(function(data){
      if(data&&data.success){
        that.setState({
          up:up
        })
      }else{
        Alert.alert("点赞失败，稍后重试")
      }
    })
    .catch(function(err){
      console.log(err)
      Alert.alert("点赞失败，稍后重试")
    })
  }

  componentWillMount(){
    var row=this.props.row
    this.setState({
      up:row.voted,
      row:row
    })
  }

  render(){
    var row=this.props.row
    return (
      <TouchableHighlight onPress={(row)=>{this.props.onSelect(row)}}>
        <View style={styles.item}>
          {row.title?
           <Text style={styles.title}>{row.title}</Text>:null
          }
          <Image source={{uri:config.qiniu.video_domain+row.qiniu_thumb}} style={styles.thumb} />
            <Icon name='ios-play' size={28} style={styles.play}/>
          
          <View style={styles.itemFooter}>
            <View style={styles.handleBox}>
              <Icon name={this.state.up?'ios-heart':'ios-heart-outline'}
                    size={28}
                    style={[styles.up,this.state.up?null:styles.down]}
                    onPress={()=>{this._up()}}/>
              <Text style={styles.handleText}
                    onPress={()=>this._up()}>喜欢</Text>
            </View>
            <View style={styles.handleBox}>
              <Icon name='ios-chatboxes-outline' size={28} style={styles.down}/>
              <Text style={styles.commentIcon}>评论</Text>
            </View>
          </View>
        </View>
      </TouchableHighlight>
    )
  }
}


export default class List extends Component {
  static navigationOptions = {
    title: '视频列表',
    headerStyle: {
      backgroundColor: '#ee735c',
      width: width,
      height: 35
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    }
  };

  constructor() {
    super()
    var ds = new ListView.DataSource({
      rowHasChanged: (r1, r2) => r1 != r2
    });
    this.state = {
      isLoadingTail:false,
      isRefreshing:false,
      dataSource: ds.cloneWithRows([]),
    }
  }
  
  _renderRow(row){//在list里面渲染item
    return <Item
            key={row._id}
            user={this.state.user}
            onSelect={() => this._loadPage(row)}
            row={row} />
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
        that._fetchData(0)
      }
    })
  }

  _fetchData(page){
    if(page!==0){
      this.setState({
        isLoadingTail:true
      });
    }else{
      this.setState({
        isRefreshing:true
      })
    }
    var user=this.state.user
    request.get(config.api.base+config.api.creations,{
      accessToken:this.state.user.accessToken,
      page:page
    })
    .then((data) => {
      var that =this
      if(data&&data.success){
        if(!data.data.length){
          return
        }
        data.data.map(function(item){
          var votes=item.votes||[]
          if (votes.indexOf(user._id)>-1) {
            item.voted=true
          }else{
            item.voted=false
          }
          return item
        })
        var items=cachedResults.items.slice()
        if(page !== 0){
          items=items.concat(data.data)
        }else{
          items=data.data
        }
        cachedResults.items=items
        cachedResults.total=data.total

        if(page !== 0){
          that.setState({
            isLoadingTail:false,
            dataSource:that.state.dataSource.cloneWithRows(cachedResults.items)
          })
        }else{
          that.setState({
            isRefreshing:false,
            dataSource:that.state.dataSource.cloneWithRows(cachedResults.items)
          })
        }

      }
    })
    .catch((error) => {
      if(page!==0){
        this.setState({
          isLoadingTail:false,
        })
      }else{
        this.setState({
          isRefreshing:false,
        })
      }
      console.warn(error);
    });
  }

  _hasMore(){
    return cachedResults.items.length!== cachedResults.total
  }

  _fetchMoreData(){
    if(!this._hasMore()||this.state.isLoadingTail){
      return
    }
    var page=cachedResults.nextPage
    cachedResults.nextPage+=1
    this._fetchData(page)
  }

  _onRefresh(){
    if(!this._hasMore()||this.state.isRefreshing){
      return
    }

    this._fetchData(0)
  }

  _renderFooter(){
    if(!this._hasMore() && cachedResults.total!==0){
      return(
        <View style={styles.loadingMore}>
          <Text style={styles.loadingText}>
            没有更多了
          </Text>
        </View>
      )
    }

    if(!this.state.isLoadingTail){
      return <View style={styles.loadingMore} />
    }

    return <ActivityIndicator style={styles.loadingMore}/>
  }

  _loadPage(row){
    //在_loadPage方法里执行navigator的push方法
    const { navigate } = this.props.navigation;
    navigate('Detail',{
              data:row
            })
    // this.props.navigator.push({
    //   name:'detail',
    //   component:Detail,
    //   params:{
    //     data:row
    //   }
    // })
  }

  render(){
    return (
      <View style={styles.container}>
        <ListView
          dataSource={this.state.dataSource}
          renderRow={(row)=>this._renderRow(row)}
          renderFooter={()=>this._renderFooter()}
          onEndReached={()=>this._fetchMoreData()}
          refreshControl={
            <RefreshControl
              refreshing={this.state.isRefreshing}
              onRefresh={()=>this._onRefresh()}
              tintColor="#f60"
              title="拼命加载中..."
              titleColor="#f60" />
          }
          onEndReachedThreshold={20}
          enableEmptySections={true}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustContentInsets ={false} />
      </View>
    )
  }
}




//es5语法
var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
    paddingTop: 10
  },
  header:{
    paddingTop:25,
    paddingBottom:12,
    backgroundColor:'#ee735c'
  },
  headerTitle:{
    color:'#fff',
    fontSize:16,
    textAlign:'center',
    fontWeight:'600'
  },
  item:{
    width:width,
    marginBottom:10,
    backgroundColor:'#fff'
  },
  thumb:{
    width:width,
    height:width * 0.56,
    // resizeMode:'cover'
    resizeMode:'contain'
    // resizeMode:'stretch'
    // resizeMode:'center'
  },
  title:{
    padding:10,
    fontSize:24,
    color:'#333',
    fontWeight: 'bold'
  },
  itemFooter:{
    flexDirection:'row',
    justifyContent:'space-between',
    backgroundColor:'#eee'
  },
  handleBox:{
    padding:10,
    flexDirection:'row',
    width:width / 2 - 0.5,
    justifyContent:'center',
    backgroundColor:'#fff'
  },
  play:{
    position:'absolute',
    bottom:14,
    right:14,
    width:46,
    height:46,
    paddingTop:9,
    paddingLeft:18,
    backgroundColor:'transparent',
    borderColor:'#fff',
    borderWidth:1,
    borderRadius:23,
    color:'#eb7d66'
  },
  handleText:{
    left:12,
    fontSize:18,
    color:'#333'
  },
  down:{
    fontSize:22,
    color:'#333'
  },
  up:{
    fontSize:22,
    color:'#eb7d66'
  },

  commentIcon:{
    fontSize:22,
    color:'#333'
  },
  loadingMore:{
    marginVertical:20,
  },
  loadingText:{
    color:'#777',
    textAlign:'center'
  }

});

module.exports=List;

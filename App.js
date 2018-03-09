/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';

import {
  Platform,
  AppRegistry,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Dimensions,
  Button,
  AsyncStorage
} from 'react-native';

// import Navigator from 'react-native-deprecated-custom-components'
import { StackNavigator } from 'react-navigation'
import Tabbar from 'react-native-tabbar-bottom'
var width = Dimensions.get('window').width;
var height = Dimensions.get('window').height;
import Slider from './app/account/slider'
import Login from './app/account/login'
import Account from './app/account/index'
import List from './app/creation/index'
import Detail from './app/creation/detail'
import Edit from './app/edit/index'


// class Details extends Component {
//   static navigationOptions = {
//     title: '视频详情',
//     headerStyle: {
//       backgroundColor: '#ee735c',
//       width: width,
//       height: 35,
//     },
//     headerTintColor: '#fff',
//     headerTitleStyle: {
//       fontWeight: 'bold',
//     }
//   };
//   render() {
//     return (
//       <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
//         <Text>视频详情</Text>
//       </View>
//     );
//   }
// }
// class HomeScreen extends Component {
//   static navigationOptions = {
//     title: '视频列表',
//     headerStyle: {
//       backgroundColor: '#ee735c',
//       width: width,
//       height: 35
//     },
//     headerTintColor: '#fff',
//     headerTitleStyle: {
//       fontWeight: 'bold',
//     }
//   };
//   render() {
//     const { navigate } = this.props.navigation;
//     return (
//       <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
//         <Text onPress={() => navigate('Detail')}>视频列表</Text>
//       </View>
//     );
//   }
// }

const Navigator = StackNavigator({
  List: { screen: List },
  Detail: { screen: Detail }
})


type Props = {};
export default class App extends Component<Props> {
  constructor() {
    super()
    this._logout = this._logout.bind(this)
    // this._afterLogin = this._afterLogin.bind(this)
    this.state = {
      user: null,
      page: "list",
      logined: false,
      entered: false,
      booted: false
    }
  }

  _asyncAppStatus() {
    var that = this
    AsyncStorage.multiGet(['user', 'entered'])
      .then((data) => {
        var userData = data[0][1]
        var entered = data[1][1]
        var user
        var newState = {
          booted: true
        }
        if (userData) {
          user = JSON.parse(userData)
        }
        if (user && user.accessToken) {
          newState.user = user
          newState.logined = true
        } else {
          newState.logined = false
        }
        if (entered === 'yes') {
          newState.entered = true
        }
        that.setState(newState)
      })
  }

  _logout() {
    AsyncStorage.removeItem('user')
    this.setState({
      logined: false,
      user: null
    })
  }

  _hideLogin(){
    this.setState({
      logined: true
    })
  }

  _afterLogin(user) {
    var that = this
    var user = JSON.stringify(user)
    AsyncStorage.setItem('user', user)
      .then(() => {
        that.setState({
          user: user,
          logined: true
        })
      })
    // that._hideLogin()
  }

  _enterSlide() {
    this.setState({
      entered: true
    }, function() {
      AsyncStorage.setItem('entered', 'yes')
    })
  }

  componentDidMount() {
    this._asyncAppStatus()
  }

  render() {
    if (!this.state.booted) {
      return (
        <View style={styles.bootPage}>
          <ActivityIndicator color='#ee735c' />
        </View>
      )
    }
    if (!this.state.entered) {
      return (<Slider enterSlide={()=>this._enterSlide()}></Slider>)
    }
    if (!this.state.logined) {
      return (<Login afterLogin={(user)=>this._afterLogin(user)}></Login>)
    }
    return (
      <View style={styles.container}>
        
        {this.state.page === "list" && this._renderHomePage()}
        {this.state.page === "edit" && this._renderEditPage()}
        {this.state.page === "account" && this._renderAccountPage()}

        <Tabbar
          stateFunc={(tab) => {
            this.setState({page: tab.page})
          }}
          tabbarBgColor='#ee735c'
          tabbarBorderTopColor='#ccc'
          iconColor='#eee'
          selectedIconColor='#fff'
          activePage={this.state.page}
          labelSize={18}
          tabs={[
            {
              page: "list",
              icon: "film"
            },
            {
              page: "edit",
              icon: "camera"
            },
            {
              page: "account",
              icon: "person"
            }
          ]}
        />
      </View>
    );
  }

  _renderHomePage(){
    return (    
      <Navigator />
    )
  }

  _renderEditPage(){
    return (
      <Edit />
    )
  }

  _renderAccountPage(){
    return (
      <Account user={this.state.user} logout={this._logout}/>
    )
  }
}




const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  bootPage: {
    width: width,
    height: height,
    backgroundColor: '#fff',
    justifyContent: 'center'
  }
});

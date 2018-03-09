import React, {
	Component
} from 'react';
import {
	StyleSheet,
	Image,
	Dimensions,
	Platform,
	View
} from 'react-native';
var width = Dimensions.get('window').width;
var height = Dimensions.get('window').height;
import Button from 'react-native-button';
import Swiper from 'react-native-swiper';

export default class Slider extends Component  {
	constructor() {
    super()
    this.state = {
      loop: false,
			banners: [
				require('../assets/images/s1.jpg'),
				require('../assets/images/s2.jpg'),
				require('../assets/images/s3.jpg')
			]
    }
  }
	_enter() {
		this.props.enterSlide()
	}

	render() {
		return (
			<Swiper style={styles.wrapper} 
							dot = {<View style={styles.dot} />}
							activeDot = {<View style={styles.activeDot}></View>}
							paginationStyle = {styles.pagination}
							loop = {this.state.loop}>
        <View style={styles.slide}>
          <Image
			      style={styles.image}
			      source={this.state.banners[0]}
				    />
        </View>
        <View style={styles.slide}>
          <Image 
						style={styles.image} 
						source={this.state.banners[1]}/> 
        </View>
        <View style={styles.slide}>
      		<Image 
						style={styles.image} 
						source={this.state.banners[2]}/> 
				  <Button
						style = {styles.btn}
						containerStyle={styles.containerStyle}
						onPress = {() => this._enter()} > 马上体验 </Button>
        </View>
      </Swiper>
		);
	}
}

var styles = StyleSheet.create({
	wrapper: {
	},
	container: {
		flex: 1
	},
	slide: {
		flex: 1,
		width: width,
		position: 'relative' 
	},
	image: {
		flex: 1,
		width: width,
		height: height
	},
	dot: {
		width: 13,
		height: 13,
		backgroundColor: 'transparent',
		borderColor: '#f60',
		borderRadius: 7,
		borderWidth: 1,
		marginLeft: 12,
		marginRight: 12
	},
	activeDot: {
		width: 13,
		height: 13,
		backgroundColor: '#ee735c',
		borderColor: '#ee735c',
		borderRadius: 7,
		borderWidth: 1,
		marginLeft: 12,
		marginRight: 12
	},
	pagination: {
		bottom: 30
	},
	containerStyle:{
		width: width - 20,
		height: 50,
		backgroundColor: '#ee735c',
		borderColor: '#ee735c',
		borderWidth: 1,
		borderRadius: 3,
		...Platform.select({
			ios:{
				position: 'absolute',
				left: 10,
				bottom: 60,
				paddingTop:10
			},
			android:{
				position: 'absolute',
				left: 10,
				bottom: 60,
				paddingTop:10
			}
		})
	},
	btn: {
		fontSize: 18,
		color: '#fff',
		fontWeight: '600'
	}
})


// module.exports = slider
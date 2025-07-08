import React,{useState,useEffect,useMemo} from 'react'
import{View,Text,TextInput,FlatList,TouchableOpacity,ActivityIndicator,Image,StyleSheet,Platform,StatusBar as RNStatusBar}from'react-native'
import{StatusBar}from'expo-status-bar'
import{Ionicons,MaterialIcons}from'@expo/vector-icons'
import AsyncStorage from'@react-native-async-storage/async-storage'
import debounce from'lodash.debounce'
import{useNavigation}from'@react-navigation/native'
import{API_BASE_URL}from'../config'

const TABS=['People','Post','Stay','Flight'],LIMIT=20,
  formatLocation=loc=>loc?.includes('|')?loc.split('|').reverse().join(', '):loc||'',
  formatDate=date=>new Date(date).toLocaleDateString('en-UK',{day:'numeric',month:'short',year:'numeric'})

export default function SearchScreen(){
  const navigation=useNavigation()
  const [query,setQuery]=useState(''),
        [selectedTab,setSelectedTab]=useState('People'),
        [userResults,setUserResults]=useState([]),
        [postResults,setPostResults]=useState([]),
        [itinResults,setItinResults]=useState([]),
        [loading,setLoading]=useState(false),
        [expanded,setExpanded]=useState({}),
        [userPosts,setUserPosts]=useState({}),
        [userItins,setUserItins]=useState({})

  const safeFetch=async url=>{
    const token=await AsyncStorage.getItem('token'),
          res=await fetch(url,{headers:{Authorization:`Bearer ${token}`}})
    if(res.status===403){
      await AsyncStorage.removeItem('token')
      navigation.reset({index:0,routes:[{name:'Login'}]})
      return null
    }
    const data=await res.json()
    return res.ok?data:null
  }

  const fetchSearch=async(q,tab)=>{
    if(!q){setUserResults([]);setPostResults([]);setItinResults([]);return}
    setLoading(true)
    if(tab==='People'){
      const users=await safeFetch(`${API_BASE_URL}/api/search/users?q=${encodeURIComponent(q)}&limit=${LIMIT}`)
      setUserResults(users?.results||[])
    }else{
      const posts=await safeFetch(`${API_BASE_URL}/api/search/posts?q=${encodeURIComponent(q)}&limit=${LIMIT}`)
      setPostResults(posts?.results||[])
      const itins=await safeFetch(`${API_BASE_URL}/api/search/itineraries?q=${encodeURIComponent(q)}&limit=${LIMIT}`)
      setItinResults(itins?.results||[])
    }
    setLoading(false)
  }

  const debounced=useMemo(()=>debounce(fetchSearch,300),[])
  useEffect(()=>{
    debounced(query,selectedTab)
    return()=>debounced.cancel()
  },[query,selectedTab])

  const loadUserDetails=async id=>{
    if(userPosts[id]===undefined){
      setUserPosts(u=>({...u,[id]:null}))
      const all=await safeFetch(`${API_BASE_URL}/api/posts/user/${id}`)
      setUserPosts(u=>({...u,[id]:Array.isArray(all)?all.slice(0,3):[]}))  
    }
    if(userItins[id]===undefined){
      setUserItins(u=>({...u,[id]:null}))
      const all=await safeFetch(`${API_BASE_URL}/api/itineraries/${id}`)
      setUserItins(u=>({...u,[id]:Array.isArray(all)?all.slice(0,3):[]}))  
    }
  }
  const toggleExpand=id=>setExpanded(e=>{
    const now=!e[id]
    if(now)loadUserDetails(id)
    return{...e,[id]:now}
  })

  const renderUser=({item})=>{
    const fc=item.followers?.length||0,
          loc=formatLocation(item.location),
          posts=userPosts[item._id],
          itins=userItins[item._id]
    return(
      <TouchableOpacity style={styles.card} onPress={()=>navigation.navigate('UserProfile',{userId:item._id})}>
        <View style={styles.cardRow}>
          {item.profilePicture
            ?<Image source={{uri:item.profilePicture}} style={styles.avatar}/>
            :<View style={styles.avatarPlaceholder}><Ionicons name="person" size={24} color="#fff"/></View>}
          <View style={styles.info}>
            <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
            {!!loc&&<Text style={styles.meta}>{loc}</Text>}
            <Text style={styles.meta}>{fc} follower{fc!==1&&'s'}</Text>
          </View>
          <TouchableOpacity style={styles.chevron} onPress={e=>{e.stopPropagation();toggleExpand(item._id)}}>
            <Ionicons name={expanded[item._id]?'chevron-up':'chevron-down'} size={20} color="#555"/>
          </TouchableOpacity>
        </View>
        {expanded[item._id]&&
          <View style={styles.dropdown}>
            {itins===null?<ActivityIndicator style={{margin:8}}/>:
             Array.isArray(itins)&&itins.length>0&&
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>Itineraries</Text>
               <FlatList
                 data={itins}
                 horizontal
                 keyExtractor={i=>i._id}
                 showsHorizontalScrollIndicator={false}
                 renderItem={({item:itin})=>{
                   const likes=Array.isArray(itin.likes)?itin.likes.length:0,
                         repostA=Array.isArray(itin.repostedBy)?itin.repostedBy:Array.isArray(itin.repostCount)?itin.repostCount:[],
                         reposts=repostA.length,
                         shares=Array.isArray(itin.shareCount)?itin.shareCount.length:typeof itin.shareCount==='number'?itin.shareCount:0
                   return(
                     <TouchableOpacity style={styles.itinPill} onPress={()=>navigation.navigate('ItineraryDetail',{itinerary:itin})}>
                       <Text style={styles.itinName} numberOfLines={1}>{itin.title}</Text>
                       <View style={styles.itinIcons}>
                         <MaterialIcons name="favorite-border" size={12} color="#555"/><Text style={styles.itinCount}>{likes}</Text>
                         <MaterialIcons name="repeat" size={12} color="#555"/><Text style={styles.itinCount}>{reposts}</Text>
                         <MaterialIcons name="share" size={12} color="#555"/><Text style={styles.itinCount}>{shares}</Text>
                       </View>
                     </TouchableOpacity>
                   )
                 }}
               />
             </View>}
            {posts===null?<ActivityIndicator style={{margin:8}}/>:
             Array.isArray(posts)&&posts.length>0&&
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>Recent Posts</Text>
               {posts.map(p=><View key={p._id} style={styles.postItem}><Text numberOfLines={2}>{p.content}</Text></View>)}
             </View>}
          </View>
        }
      </TouchableOpacity>
    )
  }

  const renderPostsTab=()=>(
    <View style={{flex:1}}>
      {loading&&itinResults.length===0?<ActivityIndicator style={{margin:12}}/>:
       itinResults.length>0&&<>
         <Text style={styles.sectionTitle}>Itineraries</Text>
         <FlatList
           data={itinResults}
           horizontal
           keyExtractor={i=>i._id}
           showsHorizontalScrollIndicator={false}
           contentContainerStyle={{paddingLeft:16,paddingBottom:8}}
           renderItem={({item:itin})=>{
             const likes=Array.isArray(itin.likes)?itin.likes.length:0,
                   repostA=Array.isArray(itin.repostedBy)?itin.repostedBy:Array.isArray(itin.repostCount)?itin.repostCount:[],
                   reposts=repostA.length,
                   shares=Array.isArray(itin.shareCount)?itin.shareCount.length:typeof itin.shareCount==='number'?itin.shareCount:0
             return(
               <TouchableOpacity style={[styles.itinPill,{paddingTop:8,paddingBottom:16}]} onPress={()=>navigation.navigate('ItineraryDetail',{itinerary:itin})}>
                 <Text style={styles.itinName} numberOfLines={1}>{itin.title}</Text>
                 <View style={styles.itinIcons}>
                   <MaterialIcons name="favorite-border" size={12} color="#555"/><Text style={styles.itinCount}>{likes}</Text>
                   <MaterialIcons name="repeat" size={12} color="#555"/><Text style={styles.itinCount}>{reposts}</Text>
                   <MaterialIcons name="share" size={12} color="#555"/><Text style={styles.itinCount}>{shares}</Text>
                 </View>
               </TouchableOpacity>
             )
           }}
         />
       </>}
      <FlatList
        data={postResults}
        keyExtractor={i=>i._id}
        renderItem={({item})=>{
          const likes=Array.isArray(item.likes)?item.likes.length:0,
                repost=Array.isArray(item.repostCount)?item.repostCount.length:typeof item.repostCount==='number'?item.repostCount:0,
                imgUrl=item.images?.[0]?.url?`${API_BASE_URL}${item.images[0].url}`:null
          return(
            <TouchableOpacity style={styles.card} onPress={()=>navigation.navigate('PostDetail',{post:item})}>
              <View style={styles.postHeader}>
                {item.userId.profilePicture?<Image source={{uri:item.userId.profilePicture}} style={styles.avatarSmall}/>:
                  <View style={styles.avatarSmallPlaceholder}><Ionicons name="person" size={16} color="#fff"/></View>}
                <Text style={styles.postAuthorName}>{item.userId.firstName} {item.userId.lastName}</Text>
              </View>
              {imgUrl&&<Image source={{uri:imgUrl}} style={styles.postImage}/>}
              <Text style={styles.postContent} numberOfLines={2}>{item.content}</Text>
              <View style={styles.postFooter}>
                <View style={styles.footerStats}>
                  <Ionicons name="heart-outline" size={14} color="#555"/><Text style={styles.footerText}>{likes}</Text>
                  <Ionicons name="repeat-outline" size={14} color="#555"/><Text style={styles.footerText}>{repost}</Text>
                </View>
                <Text style={styles.postDate}>{formatDate(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={!loading&&<Text style={styles.emptyText}>No posts found.</Text>}
        ListFooterComponent={loading&&<ActivityIndicator style={{margin:20}}/>}
        contentContainerStyle={{paddingBottom:30}}
      />
    </View>
  )

  return(
    <View style={[styles.container,{paddingTop:Platform.OS==='android'?RNStatusBar.currentHeight:20}]}>
      <StatusBar style="dark"/>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#888"/>
        <TextInput style={styles.searchInput} placeholder={`Search ${selectedTab.toLowerCase()}...`} value={query} onChangeText={setQuery}/>
      </View>
      <View style={styles.tabContainer}>
        {TABS.map(tab=>
          <TouchableOpacity key={tab} onPress={()=>setSelectedTab(tab)} style={[styles.tabItem,selectedTab===tab&&styles.tabItemActive]}>
            <Text style={[styles.tabText,selectedTab===tab&&styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        )}
      </View>
      {selectedTab==='People'
        ?<FlatList
           data={userResults}
           keyExtractor={i=>i._id}
           renderItem={renderUser}
           ListEmptyComponent={!loading&&<Text style={styles.emptyText}>No people found.</Text>}
           ListFooterComponent={loading&&<ActivityIndicator style={{margin:20}}/>}
           contentContainerStyle={{paddingBottom:30}}
         />
        :renderPostsTab()
      }
    </View>
  )
}

const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:'#fff'},
  searchBar:{flexDirection:'row',alignItems:'center',backgroundColor:'#f3f3f3',marginHorizontal:16,marginVertical:10,borderRadius:12,paddingHorizontal:12,height:40},
  searchInput:{flex:1,marginLeft:8,fontSize:16},
  tabContainer:{flexDirection:'row',backgroundColor:'#e0e0e0',borderRadius:25,marginHorizontal:16,marginVertical:8,padding:2},
  tabItem:{flex:1,alignItems:'center',paddingVertical:4,borderRadius:20},
  tabItemActive:{backgroundColor:'#fff'},
  tabText:{fontSize:16,color:'#555'},
  tabTextActive:{color:'#007bff',fontWeight:'bold'},
  card:{backgroundColor:'#fff',marginHorizontal:16,marginVertical:8,borderRadius:12,borderWidth:1,borderColor:'#eee',overflow:'hidden'},
  cardRow:{flexDirection:'row',alignItems:'center',padding:12},
  avatar:{width:48,height:48,borderRadius:24,backgroundColor:'#eee'},
  avatarPlaceholder:{width:48,height:48,borderRadius:24,backgroundColor:'#007bff',justifyContent:'center',alignItems:'center'},
  info:{flex:1,marginLeft:12},
  name:{fontSize:16,fontWeight:'bold'},
  meta:{fontSize:13,color:'#555',marginTop:2},
  chevron:{padding:8},
  dropdown:{backgroundColor:'#fafafa',margin:12,borderRadius:8,padding:12},
  section:{marginBottom:12},
  sectionTitle:{fontWeight:'600',fontSize:16,marginHorizontal:16,marginBottom:8},
  itinPill:{backgroundColor:'#fde2e4',paddingHorizontal:10,paddingVertical:6,borderRadius:16,marginRight:8,minWidth:100},
  itinName:{fontSize:14,fontWeight:'500'},
  itinIcons:{flexDirection:'row',alignItems:'center',marginTop:4},
  itinCount:{marginHorizontal:4,fontSize:12,color:'#555'},
  postItem:{backgroundColor:'#f9f9f9',padding:8,borderRadius:8,marginBottom:6,marginHorizontal:16},
  postHeader:{flexDirection:'row',alignItems:'center',padding:12},
  avatarSmall:{width:32,height:32,borderRadius:16,backgroundColor:'#eee'},
  avatarSmallPlaceholder:{width:32,height:32,borderRadius:16,backgroundColor:'#007bff',justifyContent:'center',alignItems:'center'},
  postAuthorName:{marginLeft:8,fontSize:16,fontWeight:'bold'},
  postImage:{width:'100%',height:180,resizeMode:'cover'},
  postContent:{fontSize:15,marginHorizontal:12,marginTop:8,marginBottom:8},
  postFooter:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:12,borderTopWidth:1,borderColor:'#eee'},
  footerStats:{flexDirection:'row',alignItems:'center'},
  footerText:{marginHorizontal:4,fontSize:12,color:'#555'},
  postDate:{fontSize:12,color:'#777'},
  emptyText:{textAlign:'center',marginTop:20,color:'#999'}
})

export const PREDEFINED_TAGS = [
  { id: 1, tag: 'Adventure', searchText: 'adventure thrill hiking trekking' },
  { id: 2, tag: 'Relaxing', searchText: 'relax spa unwind chill' },
  { id: 3, tag: 'Romantic', searchText: 'romantic couple honeymoon love' },
  { id: 4, tag: 'Family', searchText: 'family kids children child-friendly' },
  { id: 5, tag: 'Solo', searchText: 'solo self solo travel alone' },
  { id: 6, tag: 'Group', searchText: 'group friends together team' },
  { id: 7, tag: 'Budget', searchText: 'budget cheap low-cost backpack' },
  { id: 8, tag: 'Luxury', searchText: 'luxury premium five-star high-end' },
  { id: 9, tag: 'Road Trip', searchText: 'road trip car drive scenic' },
  { id: 10, tag: 'Weekend Getaway', searchText: 'weekend short quick escape' },
  { id: 11, tag: 'Digital Nomad', searchText: 'remote work nomad laptop' },
  { id: 12, tag: 'Beach', searchText: 'beach sand sea ocean coast' },
  { id: 13, tag: 'Mountains', searchText: 'mountain hiking climb altitude' },
  { id: 14, tag: 'Forest', searchText: 'forest jungle green nature' },
  { id: 15, tag: 'Desert', searchText: 'desert sand dunes camel' },
  { id: 16, tag: 'National Parks', searchText: 'parks nature wildlife protected' },
  { id: 17, tag: 'Wildlife Safari', searchText: 'safari animals wildlife africa' },
  { id: 18, tag: 'Hiking', searchText: 'hike trekking trails boots' },
  { id: 19, tag: 'Camping', searchText: 'camping tents outdoors bonfire' },
  { id: 20, tag: 'City Break', searchText: 'city break urban sightseeing' },
  { id: 21, tag: 'Nightlife', searchText: 'nightlife bars clubs party' },
  { id: 22, tag: 'Historic Sites', searchText: 'historic ruins landmarks monuments' },
  { id: 23, tag: 'Cultural', searchText: 'culture heritage traditions museums' },
  { id: 24, tag: 'Architecture', searchText: 'buildings design architecture' },
  { id: 25, tag: 'Street Art', searchText: 'graffiti murals art city' },
  { id: 26, tag: 'Foodie', searchText: 'foodie cuisine eats streetfood' },
  { id: 27, tag: 'Shopping', searchText: 'shopping fashion stores market' },
  { id: 28, tag: 'Wellness', searchText: 'wellness retreat balance self-care' },
  { id: 29, tag: 'Spa', searchText: 'spa massage relax luxury' },
  { id: 30, tag: 'Yoga Retreat', searchText: 'yoga wellness spiritual fitness' },
  { id: 31, tag: 'Photography', searchText: 'camera photo travel shots' },
  { id: 32, tag: 'Festival', searchText: 'festival music carnival celebration' },
  { id: 33, tag: 'Party', searchText: 'party nightlife clubbing fun' },
  { id: 34, tag: 'Summer', searchText: 'summer hot sunny beach' },
  { id: 35, tag: 'Winter', searchText: 'winter snow ski christmas' },
  { id: 36, tag: 'Spring', searchText: 'spring flowers cherry blossom' },
  { id: 37, tag: 'Autumn', searchText: 'autumn fall foliage leaves' },
  { id: 38, tag: 'Christmas', searchText: 'christmas market lights december' },
  { id: 39, tag: 'New Year', searchText: 'new year celebration fireworks' },
  { id: 40, tag: 'Asia', searchText: 'asia japan thailand bali' },
  { id: 41, tag: 'Europe', searchText: 'europe france italy greece' },
  { id: 42, tag: 'Africa', searchText: 'africa morocco kenya safari' },
  { id: 43, tag: 'Americas', searchText: 'usa canada mexico brazil' },
  { id: 44, tag: 'Oceania', searchText: 'australia new zealand' },
  { id: 45, tag: 'Middle East', searchText: 'dubai jordan israel' },
];

export const formatTagDisplay = (tag) => {
  return `${tag.tag}`;
};

export const searchTags = (searchTerm) => {
  if (!searchTerm.trim()) return PREDEFINED_TAGS;
  
  const term = searchTerm.toLowerCase().trim();
  return PREDEFINED_TAGS.filter(tag => 
    tag.searchText.includes(term)
  );
};
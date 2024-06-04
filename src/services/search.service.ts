import { elasticSearchClient, getDocumentById } from '@auth/elasticsearch';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { IHitsTotal, IPaginateProps, IQueryList, ISearchResult, ISellerGig } from '@irshadkhan2019/job-app-shared';

export async function gigById(index: string, gigId: string): Promise<ISellerGig> {
  const gig: ISellerGig = await getDocumentById(index, gigId);
  return gig;
}

export async function gigsSearch(
  searchQuery: string, //user types in search input
  paginate: IPaginateProps,
  deliveryTime?: string, //filter based on dilevry date
  min?: number, //filter based on price
  max?: number
): Promise<ISearchResult> {
  const { from, size, type } = paginate;

  const queryList: IQueryList[] = [
    {
      query_string: {
        fields: ['username', 'title', 'description', 'basicDescription', 'basicTitle', 'categories', 'subCategories', 'tags'],
        query: `*${searchQuery}*`
      }
    },
    {
      term: {
        active: true
      }
    }
  ];

  // used for filtering based on expected delivery date
  if (deliveryTime !== 'undefined') {
    queryList.push({
      query_string: {
        fields: ['expectedDelivery'],
        query: `*${deliveryTime}*`
      }
    });
  }

  // used for filtering based on range check
  if (!isNaN(parseInt(`${min}`)) && !isNaN(parseInt(`${max}`))) {
    queryList.push({
      range: {
        price: {
          gte: min,
          lte: max
        }
      }
    });
  }

  // Actual Search
  const result: SearchResponse = await elasticSearchClient.search({
    index: 'gigs',
    size,
    query: {
      bool: {
        must: [...queryList]
      }
    },
    // sortId field is there in document 
    // sort gigs in ascending or descending order
    sort: [
      {
        sortId: type === 'forward' ? 'asc' : 'desc'
      }
    ],
    // for first search we dont want pagination
    ...(from !== '0' && { search_after: [from] })
  });
//eg. 0 1  2 3 4 5 6 7 8 9 -total gigs
//size =2 e.e per page we have 2 items
// first we get 0 1 ,here from =1 ,last result obtained
//user clicks forward btn elastic search starts search after 1 i.e 2 ->fetch 2 3 ,now from =3 
// and so on.

const total: IHitsTotal = result.hits.total as IHitsTotal;
  return {
    total: total.value,
    hits: result.hits.hits
  };
}

// "hits": {
//   "total": {
//     "value": 6,
//     "relation": "eq"
//   },
//   "max_score": 1,
//   "hits": [
//     {
//       "_index": "gigs",
//       "_id":
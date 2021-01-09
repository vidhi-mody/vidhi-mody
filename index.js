if (process.env.NODE_ENV === 'local') {
  require('dotenv').config()
}

const algoliasearch = require('algoliasearch')
const ejs = require('ejs')
const { promises: fs } = require('fs')
const _ = require('lodash')
const toml = require('toml')

const getRecentPosts = async (index) => {
  const { hits } = await index.search('', {
    getRankingInfo: true,
    analytics: false,
    enableABTest: false,
    hitsPerPage: 100,
    attributesToRetrieve: '*',
    attributesToSnippet: '*:20',
    snippetEllipsisText: '…',
    responseFields: '*',
    page: 0,
    maxValuesPerFacet: 100,
    facets: ['*', 'no_variables', 'tags'],
    facetFilters: [['tags:blog']]
  })

  const recentPosts = _.chain(hits)
    .filter((hit) => {
      return hit.type === 'lvl1'
    })
    .map((hit) => {
      return {
        url: hit.url_without_anchor,
        title: hit.hierarchy.lvl1
      }
    })
    .sortBy((hit) => hit.url)
    .value()

  return recentPosts.slice(-5).reverse()
}

const parseProperties = async (filePath) => {
  const properties = await fs.readFile(filePath, { encoding: 'utf-8' })
  return toml.parse(properties)
}

const main = async () => {
  const client = algoliasearch(
    process.env.ALGOLIA_APPLICATION_ID,
    process.env.ALGOLIA_API_KEY
  )

  const index = client.initIndex(process.env.ALGOLIA_INDEX)

  const posts = await getRecentPosts(index)

  const propertiesObj = await parseProperties('./config.toml')

  const htmlString = await ejs.renderFile('index.ejs', {
    ...propertiesObj,
    posts,
    lastRunOn: new Date().toISOString()
  })

  await fs.writeFile('./README.md', htmlString, { encoding: 'utf-8' })
}

main()

/* ========================================================================== */
/* Globals */
const domParser = new DOMParser()
const locale = window.location.pathname.split(/\//)[1]

var originalProductList
var partitionedProductList
var isSorting = false
var count = 0
const statusMap = {
  fr: {
    done: 'Classement complété',
    progress: 'Classement en cours...',
    appName: "Classement Lufa",
    appPresentation: "Veuillez cliquer sur 'Ordonner' pour faire le classement des produits selon leur popularité",
    sortBtn: 'Ordonner',
    autoOrder: "La page est automatiquement ordonnée à cause de l'option que vous avez activée",
  },
  en: {
    done: 'Sorting complete',
    appName: 'Lufa Sorter',
    progress: 'Sorting in progress...',
    appPresentation: "Click the 'sort' button to sort the products according to their popularity",
    sortBtn: 'Sort',
    autoOrder: 'Page is automatically sorted because of the options you enabled',
  },

}

/* ========================================================================== */
/* Update callbacks */
function sortComplete(){
  isSorting = false
  updateMenu()
}

function sortStarted(){
  isSorting = true
  updateMenu()
}

function fetchComplete(){
  count += 1
  updateMenu()
}

/* ========================================================================== */
/* Entry point */
main()

function main(){

  let htmlProductNodes = [].slice.call(document.querySelectorAll('.family-products > .single-product-wrapper'))
  if (!htmlProductNodes){
    return
  }

  /* extend with metadata */
  originalProductList = htmlProductNodes.map(htmlNode => {
    return {
      htmlNode,
      uuid: getProductUUID(htmlNode),
      nbComments: getNbCommentsFromNode(htmlNode),
      weigthedRating: getProductRating(htmlNode)
    }
  })

  // Do preliminary sorting and then partition by rating
  partitionedProductList = partitionByRating(originalProductList)
  runPreliminarySorting()

  chrome.storage.sync.get({
    autoOrder: false
  }, function(items) {
    console.log(items)
    let autoOrder = items.autoOrder == "true"
    url = chrome.runtime.getURL('menu.tpl')
    fetch(url).then(convertToHtml).then(htmlDoc => {
        injectMenu(htmlDoc, autoOrder)
        if (autoOrder){
          runDetailedSorting()
        }
    })
  })
}

function runPreliminarySorting(){
  initProductList()
  // copies and keep original intact
  injectProductList(originalProductList.concat().sort(sortDesc))
}

function runDetailedSorting(){
  sortStarted()
  var partitions = [[],[],[],[],[],[]]
  let partitionPromiseList = partitionedProductList.map((productPartition, i) => {
    console.log('sendProductRatingPromiseRequest', 5-i)
    let productRatingsPromiseList = getProductRatingPromiseList(productPartition)
    return Promise.all(productRatingsPromiseList)
      .then(productRatingList => {
        let sortedProductList = productRatingList.sort(sortDesc)
        partitions[i] = sortedProductList
        // injectProductList([].concat.apply([], partitions))
        replacePartition(sortedProductList, i)
        console.log('replacePartition', sortedProductList, 5-i)
      })
  })
  Promise.all(partitionPromiseList).then(sortComplete)
}

function getProductRatingPromiseList(myProductList){
  return myProductList.map(product => {
    var productNode = product.htmlNode
    return new Promise((resolve, reject)=> {
      let url = productNode.querySelector('.product-reviews > a').href.replace(/#[a-zA-Z0-9]+$/g, '')
      fetchProductRating(url, domParser).then(ratings => {
        fetchComplete()
        resolve({
          ...product,
          ratings,
          weigthedRating: calcWeigthedRating(ratings)
        })
      })
    })
  })
}
/* ========================================================================== */
/* DOM manipulation methods */
function injectMenu(htmlDoc, autoOrder){
 let element = document.querySelector('.products-list')
 let newElement = htmlDoc.querySelector('.lufa-scraper-wrapper')

 newElement.querySelector('#auto-order').style.display = autoOrder ? 'block': 'none'
 newElement.querySelector('#auto-order').innerHTML = statusMap[locale]['autoOrder']

 newElement.querySelector('#status-message').innerHTML = getStatusMessage()
 newElement.querySelector('#app-name').innerHTML = statusMap[locale]['appName']
 newElement.querySelector('#app-presentation').innerHTML = statusMap[locale]['appPresentation']

 newElement.querySelector('#promise-counter').innerHTML = `<progress max="${originalProductList.length}" value="${count}"/>`

 newElement.querySelector('#btn-sort').innerHTML = statusMap[locale]['sortBtn']
 newElement.querySelector('#btn-sort').addEventListener('click', runDetailedSorting)
 element.parentNode.insertBefore(newElement, element)
}

function updateMenu(nbPromises){
  document.querySelector('#status-message').innerHTML = getStatusMessage()
  document.querySelector('#promise-counter').innerHTML = `<progress max="${originalProductList.length}" value="${count}"/>`
  document.querySelector('#progress-container').style.display = isSorting ? 'block': 'none'
  document.querySelector('#btn-sort').disabled = isSorting
}

function initProductList(){
  let featuredGrid = document.querySelector('.family-featured-products.grid')
  featuredGrid.parentNode.removeChild(featuredGrid)

  let grid = document.querySelector('.family-products.grid')
  if (!grid){
    return
  }
}

function injectProductList(productList){
  let grid = document.querySelector('.family-products.grid')
  grid.innerHTML= ''
  productList.forEach(product => {
    grid.appendChild(product.htmlNode)
  })
}

function replacePartition(partition, partitionIndex){
  var oldPartion = partitionedProductList[partitionIndex]
  partition.forEach((e, i) => {
    let child = oldPartion[i].htmlNode
    child.parentNode.replaceChild(e.htmlNode, child)
  })
}

/* ========================================================================== */
/* Utils */
function getStatusMessage(){
  let key = isSorting ? 'progress' : 'done'
  return statusMap[locale][key]
}

function stripNonNumeric(str){
  return Number(str.replace(/\D/g,''))
}

function partitionByRating(list){
  let nbStars = 5
  let partitions = [[],[],[],[],[],[]] /* 0,1,2,3,4,5 stars */
  list.forEach(e => {
    partitions[nbStars - e.weigthedRating].push(e) //reverse order
  })
  return partitions
}

/* ========================================================================== */
/* Sorting methods */
function calcWeigthedRating(ratings) {
  let score = Object.keys(ratings).reduce((sum, nbStar)=> {
    return sum + nbStar * ratings[nbStar]
  }, 0)
  if (score == 0) {
    return score
  }

  return score / Object.values(ratings).reduce( (sum, v)=> {return sum + v}, 0)
}

function sortDesc(a, b){
  let diff = b.weigthedRating - a.weigthedRating
  if (diff) {
    return diff
  }
  else {
    return b.nbComments - a.nbComments
  }
}

/* ========================================================================== */
/* Node parsing methods */
function getRatingFromNode(node) {
  let textRegexp = /rating-[0-9]+/g
  return stripNonNumeric(node.className.split(/\s+/).find(clazz => {
      return textRegexp.test(clazz)
  }))
}

function getProductUUID(productNode){
  let n = productNode.querySelector('.single-product')
  return `[${n.attributes["data-pid"].name}=${n.attributes["data-pid"].value}]`
}

function getProductRating(productNode){
  let ratingNode = productNode.querySelector('.product-reviews > a > span:nth-of-type(1)')
  return getRatingFromNode(ratingNode)
}

function getNbCommentsFromNode(productNode){
  return stripNonNumeric(productNode.querySelector('.product-reviews > a > span:nth-of-type(2)').innerHTML)
}

/* ========================================================================== */
/* Data fetching methods */

function convertToHtml(response){
  return response.text().then(html => {
    return domParser.parseFromString(html, "text/html")
  })
}

function fetchProductRating(url){
  let headers = new Headers({'Content-Type': 'text/html'})
  let req = new Request(url, {headers,  credentials: 'include'})
  return fetch(req).then(convertToHtml).then(htmlDoc => {
    ratingNodes = htmlDoc.querySelectorAll('.aggregate-ratings.product-ratings')
    nbRatingNodes = htmlDoc.querySelectorAll('.aggregate-ratings > div > .rating-number')

    return  [].slice.call(ratingNodes).reduce( (curMap, node, i) => {
       let rating = getRatingFromNode(node)
       let hash = {}
       hash[rating] = Number(nbRatingNodes[i].innerHTML)
       return {...curMap, ...hash}
     }, {})
   })
}

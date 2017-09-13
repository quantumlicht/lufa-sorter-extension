/* ========================================================================== */
/* Globals */
const domParser = new DOMParser()
const locale = window.location.pathname.split(/\//)[1]


var htmlProductNodes
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


  htmlProductNodes = document.querySelectorAll('.family-products > .single-product-wrapper')
  if (!htmlProductNodes){
    return
  }

  chrome.storage.sync.get({
    autoOrder: false
  }, function(items) {
    let {autoOrder} = items
    url = chrome.runtime.getURL('menu.tpl')
    fetch(url).then(convertToHtml).then(htmlDoc => {
        injectMenu(htmlDoc, autoOrder)
        if (autoOrder){
          runSorting()
        }
    })
  })
}

function runSorting(){
  sortStarted()
  let productRatingsPromiseList = [].slice.call(htmlProductNodes).map((htmlProductNode,i) => {
    return new Promise((resolve, reject)=> {
      let url = htmlProductNode.querySelector('.product-reviews > a').href.replace(/#[a-zA-Z0-9]+$/g, '')
      fetchProductRatings(url, domParser).then(ratings => {
        fetchComplete()
        resolve({
          htmlProductNode,
          ratings,
          weightedRank: getWeightedRank(ratings),
          nbComments: getNbCommentsFromNode(htmlProductNode)
        })
      })
    })
  })

  Promise.all(productRatingsPromiseList)
    .then(productRatingList => {
      let sortedProductList = productRatingList.sort(sortDesc)
      sortComplete()
      console.log('sortedProductList', sortedProductList)
      injectNewProductList(sortedProductList)
    })
}

function getStatusMessage(){
  let key = isSorting ? 'progress' : 'done'
  return statusMap[locale][key]
}

/* ========================================================================== */

function injectMenu(htmlDoc, autoOrder){
 let element = document.querySelector('.products-list')
 let newElement = htmlDoc.querySelector('.lufa-scraper-wrapper')

 newElement.querySelector('#auto-order').style.display = autoOrder ? 'block': 'none'
 newElement.querySelector('#auto-order').innerHTML = statusMap[locale]['autoOrder']

 newElement.querySelector('#status-message').innerHTML = getStatusMessage()
 newElement.querySelector('#app-name').innerHTML = statusMap[locale]['appName']
 newElement.querySelector('#app-presentation').innerHTML = statusMap[locale]['appPresentation']

 newElement.querySelector('#promise-counter').innerHTML = `<progress max="${htmlProductNodes.length}" value="${count}"/>`

 newElement.querySelector('#btn-sort').innerHTML = statusMap[locale]['sortBtn']
 newElement.querySelector('#btn-sort').addEventListener('click', runSorting)
 element.parentNode.insertBefore(newElement, element)
}

function updateMenu(nbPromises){
  document.querySelector('#status-message').innerHTML = getStatusMessage()
  document.querySelector('#promise-counter').innerHTML = `<progress max="${htmlProductNodes.length}" value="${count}"/>`
  document.querySelector('#progress-container').style.display = isSorting ? 'block': 'none'
  document.querySelector('#btn-sort').disabled = isSorting
}
/* DOM manipulation methods */
function injectNewProductList(productList){
  let featuredGrid = document.querySelector('.family-featured-products.grid')
  featuredGrid.parentNode.removeChild(featuredGrid)

  let grid = document.querySelector('.family-products.grid')
  if (!grid){
    return
  }
  grid.innerHTML= ''
  for( let i=0; i< productList.length; i++) {
    grid.appendChild(productList[i].htmlProductNode)
  }
}

/* ========================================================================== */
/* Utils */
function stripNonNumeric(str){
  return Number(str.replace(/\D/g,''))
}

/* ========================================================================== */
/* Sorting methods */
function getWeightedRank(ratings) {
  let score = Object.keys(ratings).reduce((sum, nbStar)=> {
    return sum + nbStar * ratings[nbStar]
  }, 0)
  if (score == 0) {
    return score
  }

  return score / Object.values(ratings).reduce( (sum, v)=> {return sum + v}, 0)
}

function sortAsc(a, b){
  let diff = a.weightedRank - b.weightedRank
  if (diff) {
    return diff
  }
  else {
    return a.nbComments - b.nbComments
  }
}

function sortDesc(a, b){
  let diff = b.weightedRank - a.weightedRank
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
  return stripNonNumeric(node.className.split(/\s+/).find( clazz => {
      return textRegexp.test(clazz)
  }))
}

function getProductRatingFromNode(productNode){
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
function fetchProductRatings(url){
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

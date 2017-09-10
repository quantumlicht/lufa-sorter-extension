/* ========================================================================== */
/* Entry point */
const domParser = new DOMParser()
const locale = window.location.pathname.split(/\//)[1]
const statusMap = {
  fr: {
    done: 'Classement complété',
    progress: 'Classement en cours...',
    presentation: 'Veuillez patienter pendant le classement des produits selon leur popularité'
  },
  en: {
    done: 'Sorting complete',
    progress: 'Sorting in progress...',
    presentation: 'Please wait while we sort the products according to their popularity'
  }
}

main()

function main(){
  let htmlProductNodes = document.querySelectorAll('.single-product-wrapper')
  if (!htmlProductNodes){
    return
  }
  url = chrome.runtime.getURL('menu.tpl')
  fetch(url).then(convertToHtml).then(htmlDoc => {
      return injectMenu(htmlDoc, htmlProductNodes.length)
  }).then(()=>{
    runSorting(htmlProductNodes)
  })
}

function runSorting(htmlProductNodes){
  let counter = 0
  let productRatingsPromiseList = [].slice.call(htmlProductNodes).map((htmlProductNode,i) => {
    return new Promise((resolve, reject)=> {
      let url = htmlProductNode.querySelector('.product-reviews > a').href.replace(/#[a-zA-Z0-9]+$/g, '')
      fetchProductRatings(url, domParser).then(ratings => {
        counter += 1
        updateMenu(counter, htmlProductNodes.length)
        resolve({
          htmlProductNode,
          ratings,
          nbComments: getNbCommentsFromNode(htmlProductNode)
        })
      })
    })
  })

  Promise.all(productRatingsPromiseList)
    .then(productRatingList => {
      let sortedProductList = productRatingList.sort(sortDesc)
      console.log('sortedProductList', sortedProductList)
      injectNewProductList(sortedProductList)
    })
}

function getStatusMessage(count, total){
  let key = count == total ? 'done' : 'progress'
  return statusMap[locale][key]
}

/* ========================================================================== */

function injectMenu(htmlDoc, nbPromises){
 let element = document.querySelector('.products-list')
 let newElement = htmlDoc.querySelector('div#lufa-scraper-container')
 newElement.querySelector('#status-message').innerHTML = getStatusMessage(0, nbPromises)
 newElement.querySelector('#presentation').innerHTML = statusMap[locale]['presentation']
 newElement.querySelector('#promise-counter').innerHTML = `<progress max="${nbPromises}" value="${0}"/>`
 element.parentNode.insertBefore(newElement, element)
}

function updateMenu(count, nbPromises){
  document.querySelector('#status-message').innerHTML = getStatusMessage(count, nbPromises)
  document.querySelector('#promise-counter').innerHTML = `<progress max="${nbPromises}" value="${count}"/>`
}
/* DOM manipulation methods */
function injectNewProductList(productList){
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
function getWeightedRank(product) {
  let score = Object.keys(product.ratings).reduce((sum, nbStar)=> {
    return sum + nbStar * product.ratings[nbStar]
  }, 0)
  return score / Object.values(product.ratings).reduce( (sum, v)=> {return sum + v}, 0)
}

function sortAsc(a, b){
  return getWeightedRank(a) - getWeightedRank(b)
}

function sortDesc(a, b){
  return getWeightedRank(b) - getWeightedRank(a)
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

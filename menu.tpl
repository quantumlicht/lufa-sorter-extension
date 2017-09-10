<style>
  #lufa-scraper-container {
    border: 1px solid #e5e3e0;
    padding: 5px;
    background: white;
    font-family: 'gibsonregular';
    -webkit-box-shadow: 0 8px 6px -6px #808080;
    box-shadow: 0 8px 6px -6px #808080;
  }
  #app-name {
    text-align: center;
    font-size: 24px;
  }

  #progress-container {
    margin: 10px 0;
    text-align: center;
  }
  #app-presentation {
    text-align: center;
    font-size: 18px;
  }

  #btn-sort {
    margin: 5px 0;
    border: none;
    text-align: center;
    text-decoration: none;
    color: white;
    padding: 5px 15px 5px 15px;
    background-color: #719500;
    font-size: 18px;
    cursor: pointer;
  }
  #btn-sort:disabled {
    background-color: #ababab;
  }
  #btn-container {
    padding: 10px;
    text-align: center;
  }
</style>

<div id='lufa-scraper-container'>
  <div id="app-name"></div>
  <div id="app-presentation"></div>

  <div id="progress-container" style='display:none;'>
    <div id='status-message'></div>
    <div id='promise-counter'></div>
  </div>

  <div id="btn-container">
    <button id="btn-sort"></button>
  </div>
</div>

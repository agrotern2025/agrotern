fetch('/agrotern/template/head.html')
    .then(res => res.text())
    .then(data => document.querySelector('head').innerHTML = data);

fetch('/agrotern/template/header.html')
    .then(res => res.text())
    .then(data => document.getElementById('header').innerHTML = data);

fetch('/agrotern/template/footer.html')
    .then(res => res.text())
    .then(data => document.getElementById('footer').innerHTML = data);

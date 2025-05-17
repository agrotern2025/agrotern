fetch('/template/head.html')
    .then(res => res.text())
    .then(data => document.querySelector('head').innerHTML = data);

fetch('/template/header.html')
    .then(res => res.text())
    .then(data => document.getElementById('header').innerHTML = data);

fetch('/template/footer.html')
    .then(res => res.text())
    .then(data => document.getElementById('footer').innerHTML = data);
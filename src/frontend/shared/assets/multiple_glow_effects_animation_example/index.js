let btn = document.querySelector("button");
let radios = document.querySelectorAll("[type=radio]");

radios[Math.floor(Math.random() * radios.length)].checked = true;

radios.forEach((r) => {
    r.onchange = (e) => {
        btn.dataset.effect = e.currentTarget.value;
        btn.classList.remove('textShine');
        window.requestAnimationFrame(() => {
            btn.classList.add('textShine');
        });
    };
    if( r.checked ) {
        btn.dataset.effect = r.value;
    }
});

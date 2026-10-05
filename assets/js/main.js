const menuButton=document.querySelector('.menu-toggle');
const mobileMenu=document.querySelector('#mobile-menu');
const closeMenu=()=>{menuButton?.setAttribute('aria-expanded','false');mobileMenu?.setAttribute('aria-hidden','true');mobileMenu?.classList.remove('is-open');document.body.classList.remove('menu-open')};
menuButton?.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')==='true';menuButton.setAttribute('aria-expanded',String(!open));mobileMenu.setAttribute('aria-hidden',String(open));mobileMenu.classList.toggle('is-open',!open);document.body.classList.toggle('menu-open',!open)});
document.querySelectorAll('.mobile-menu a, .site-header a').forEach(link=>link.addEventListener('click',closeMenu));
document.querySelectorAll('[data-media-slot]').forEach((frame)=>{const video=frame.querySelector('video');const source=frame.dataset.video;if(source){video.src=source;frame.classList.add('has-video');video.play().catch(()=>{});}});
const videoPlaceholder=document.querySelector('[data-video-placeholder]');
const videoStatus=document.querySelector('#hero-video-status');
videoPlaceholder?.addEventListener('click',()=>{if(videoStatus){videoStatus.hidden=false;videoStatus.textContent='ویدئوی معرفی محصول هنوز منتشر نشده است.';}});

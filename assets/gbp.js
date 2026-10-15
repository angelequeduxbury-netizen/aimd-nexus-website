(()=>{
const d=document,root=d.documentElement,rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const hdr=d.getElementById('hdr'),px=[...d.querySelectorAll('[data-speed]')],proc=d.getElementById('process'),pst=[...d.querySelectorAll('.pstep')];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));let tick=false;
function frame(){tick=false;const y=scrollY,vh=innerHeight,h=root.scrollHeight-vh;
 hdr.classList.toggle('is-scrolled',y>40);hdr.style.setProperty('--p',h>0?(y/h).toFixed(4):0);
 if(!rm){const k=innerWidth<760?.5:1;px.forEach(el=>{const r=el.parentElement.getBoundingClientRect();if(r.bottom<-250||r.top>vh+250)return;const c=r.top+r.height/2-vh/2;el.style.transform='translate3d(0,'+(c*-parseFloat(el.dataset.speed)*k).toFixed(1)+'px,0)'})}
 if(proc){const r=proc.getBoundingClientRect(),rail=proc.querySelector('.rail').getBoundingClientRect();const p=clamp((vh*.62-rail.top)/rail.height,0,1);proc.style.setProperty('--prog',p.toFixed(3));pst.forEach((s,i)=>s.classList.toggle('on',p>=i/pst.length-.02&&p>0||i===0&&rail.top<vh*.7))}}
function req(){if(!tick){tick=true;requestAnimationFrame(frame)}}
addEventListener('scroll',req,{passive:true});addEventListener('resize',req);frame();
requestAnimationFrame(()=>root.classList.add('ready'));
const rev=[...d.querySelectorAll('[data-r],.ln2')];
if('IntersectionObserver'in window&&!rm){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -6% 0px'});rev.forEach(el=>io.observe(el))}else rev.forEach(el=>el.classList.add('in'));
/* story: phone screens follow the steps */
const stage=d.querySelector('.stage'),steps=[...d.querySelectorAll('.step')];
if(stage&&'IntersectionObserver'in window){steps[0]&&steps[0].classList.add('is-on');const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){stage.dataset.screen=e.target.dataset.screen;steps.forEach(s=>s.classList.toggle('is-on',s===e.target))}}),{rootMargin:matchMedia('(max-width:980px)').matches?'-72% 0px -16% 0px':'-42% 0px -42% 0px'});steps.forEach(s=>so.observe(s))}else steps.forEach(s=>s.classList.add('is-on'));
/* foundations: checklist drives the profile card highlight */
const items=[...d.querySelectorAll('.checks li')],card=d.querySelector('.found-art .pc');
function hl(part){items.forEach(i=>i.classList.toggle('is-active',i.dataset.part===part));card&&card.querySelectorAll('[data-part]').forEach(n=>n.classList.toggle('hl',n.dataset.part===part))}
if(items.length){hl(items[0].dataset.part);items.forEach(i=>{i.addEventListener('mouseenter',()=>hl(i.dataset.part))});if('IntersectionObserver'in window){const fo=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)hl(e.target.dataset.part)}),{rootMargin:'-45% 0px -45% 0px'});items.forEach(i=>fo.observe(i))}else items.forEach(i=>i.classList.add('is-active'))}
/* compare slider */
const cmp=d.getElementById('compare');
if(cmp){const rg=cmp.querySelector('.cmp-r');cmp.classList.add('is-slider');const set=v=>{cmp.style.setProperty('--pos',v+'%');rg.value=v};set(50);rg.addEventListener('input',()=>set(rg.value));
 if(!rm&&'IntersectionObserver'in window){const co=new IntersectionObserver(es=>{if(es[0].isIntersecting){co.disconnect();const t0=performance.now();(function f(t){const k=clamp((t-t0)/1500,0,1),e=1-Math.pow(1-k,3);set((92-42*e).toFixed(1));if(k<1)requestAnimationFrame(f)})(t0)}},{threshold:.5});co.observe(cmp)}}
/* mobile menu */
const btn=d.querySelector('.menu-btn'),menu=d.getElementById('mmenu');
function setMenu(o){hdr.classList.toggle('menu-open',o);root.classList.toggle('lock',o);btn.setAttribute('aria-expanded',o);menu.hidden=!o;if(o)menu.querySelector('a').focus();else btn.focus()}
btn.addEventListener('click',()=>setMenu(menu.hidden));menu.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false)});
d.addEventListener('keydown',e=>{if(menu.hidden)return;if(e.key==='Escape')setMenu(false);if(e.key==='Tab'){const f=[btn,...menu.querySelectorAll('a')],i=f.indexOf(d.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}}});
matchMedia('(min-width:981px)').addEventListener('change',e=>{if(e.matches&&!menu.hidden)setMenu(false)});
})();

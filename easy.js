document.addEventListener('DOMContentLoaded', function(){
  const ring = document.querySelector('.ring');
  const tiles = Array.from(document.querySelectorAll('.tile'));
  const carousel = document.querySelector('.carousel');
  const leftBtn = document.querySelector('.control.left');
  const rightBtn = document.querySelector('.control.right');

  const count = tiles.length;
  const deg = 360 / count;
  const radius = Math.min(420, window.innerWidth * 0.36) + 'px';

  // set CSS vars for tiles
  tiles.forEach((t,i)=>{
    t.style.setProperty('--i', i);
    t.style.setProperty('--deg', deg + 'deg');
    t.style.setProperty('--radius', radius);
    // position via transform using CSS variables
    t.style.transform = `rotateY(${i * deg}deg) translateZ(${radius}) translate(-50%,-50%)`;
    // hover handlers
    t.addEventListener('mouseenter', ()=>{ paused = true; t.classList.add('focused'); carousel.classList.add('paused'); });
    t.addEventListener('mouseleave', ()=>{ paused = false; t.classList.remove('focused'); carousel.classList.remove('paused'); });
    // click to open (placeholder)
    t.addEventListener('click', ()=>{
      const slug = t.dataset.slug || 'challenge';
      const target = /^https?:/i.test(slug) ? slug : new URL(slug, window.location.href).href;
      window.location.href = target;
    });
  });

  let rotation = 0;
  let speed = 0.06; // degrees per frame
  let paused = false;
  let lastTime = null;

  function frame(t){
    if (lastTime === null) lastTime = t;
    const dt = t - lastTime;
    lastTime = t;
    if (!paused) {
      rotation = (rotation + speed * (dt/16.67)) % 360;
      ring.style.transform = `translateZ(-100px) rotateY(${rotation}deg)`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // controls rotate by one tile
  function rotateBy(direction){
    paused = true;
    const step = deg * direction;
    rotation = rotation + step;
    ring.style.transform = `translateZ(-100px) rotateY(${rotation}deg)`;
    setTimeout(()=>{ paused = false; }, 900);
  }

  leftBtn.addEventListener('click', ()=> rotateBy(1));
  rightBtn.addEventListener('click', ()=> rotateBy(-1));

  // keyboard support
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowLeft') rotateBy(1);
    if (e.key === 'ArrowRight') rotateBy(-1);
  });

  // pause on whole carousel hover
  carousel.addEventListener('mouseenter', ()=>{ paused = true; carousel.classList.add('paused'); });
  carousel.addEventListener('mouseleave', ()=>{ paused = false; carousel.classList.remove('paused'); });

  // Touch/swipe support for mobile
  let touchStartX = 0;
  let touchEndX = 0;
  const minSwipeDistance = 50;

  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    paused = true;
  }, { passive: true });

  carousel.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
    setTimeout(() => { paused = false; }, 100);
  }, { passive: true });

  function handleSwipe() {
    const swipeDistance = touchEndX - touchStartX;
    if (Math.abs(swipeDistance) < minSwipeDistance) return;
    
    if (swipeDistance > 0) {
      // Swipe right - go to previous
      rotateBy(1);
    } else {
      // Swipe left - go to next
      rotateBy(-1);
    }
  }
});

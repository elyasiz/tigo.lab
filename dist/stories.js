export function initializeStories({reduced=()=>false}={}){
  const section=document.querySelector('#cerita-bermain');
  if(!section)return;
  const track=section.querySelector('#storyTrack');
  const slides=[...track.querySelectorAll('.story-slide')];
  const videos=slides.map(slide=>slide.querySelector('video'));
  const dots=[...section.querySelectorAll('[data-story]')];
  const previous=section.querySelector('#storyPrev'),next=section.querySelector('#storyNext');
  const names=['Eksplorasi sensori','Eksplorasi energi'];
  let active=0,scrollFrame;
  function update(index){
    active=Math.max(0,Math.min(slides.length-1,index));
    slides.forEach((slide,i)=>{
      slide.inert=i!==active;slide.setAttribute('aria-hidden',String(i!==active));
      if(i!==active)videos[i].pause();
    });
    dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===active)));
    previous.disabled=active===0;next.disabled=active===slides.length-1;
    section.querySelector('#storyCounter').textContent=`${String(active+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
    section.querySelector('#storyAnnouncement').textContent=`Video ${active+1} dari ${slides.length}: ${names[active]}.`;
  }
  function goTo(index){
    const target=Math.max(0,Math.min(slides.length-1,index));
    videos.forEach(video=>video.pause());
    track.scrollTo({left:target*track.clientWidth,behavior:reduced()?'instant':'smooth'});
  }
  previous.addEventListener('click',()=>goTo(active-1));
  next.addEventListener('click',()=>goTo(active+1));
  dots.forEach(dot=>dot.addEventListener('click',()=>goTo(Number(dot.dataset.story))));
  track.addEventListener('keydown',event=>{
    // Native video controls keep their own arrow-key seeking behavior.
    if(event.target!==track)return;
    const destination={ArrowLeft:active-1,ArrowRight:active+1,Home:0,End:slides.length-1}[event.key];
    if(destination===undefined)return;
    event.preventDefault();goTo(destination);
  });
  track.addEventListener('scroll',()=>{
    cancelAnimationFrame(scrollFrame);
    scrollFrame=requestAnimationFrame(()=>{
      const index=Math.round(track.scrollLeft/track.clientWidth);
      if(index!==active)update(index);
    });
  },{passive:true});
  new ResizeObserver(()=>{track.scrollTo({left:active*track.clientWidth,behavior:'instant'});}).observe(track);
  videos.forEach(video=>video.addEventListener('error',()=>{video.closest('.story-media').querySelector('.story-error').hidden=false;}));
  // Only one video on the page may play at a time, including product demos.
  document.addEventListener('play',event=>{
    if(event.target instanceof HTMLVideoElement)document.querySelectorAll('video').forEach(video=>{if(video!==event.target)video.pause();});
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)videos.forEach(video=>video.pause());});
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)videos.forEach(video=>video.pause());}).observe(track);
  update(0);
}

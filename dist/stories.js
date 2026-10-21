export function initializeStories({reduced=()=>false}={}){
  const section=document.querySelector('#cerita-bermain');
  if(!section)return;
  const track=section.querySelector('#storyTrack');
  const slides=[...track.querySelectorAll('.story-slide')];
  const videos=slides.map(slide=>slide.querySelector('video'));
  const dots=[...section.querySelectorAll('[data-story]')];
  const previous=section.querySelector('#storyPrev'),next=section.querySelector('#storyNext');
  const announcement=section.querySelector('#storyAnnouncement');
  const names=['Eksplorasi sensori','Eksplorasi energi'];
  const expectedPauses=new WeakSet();
  let active=0,scrollFrame,inView=false,automatic=!reduced(),soundBlocked=false;
  let audio={muted:false,volume:1};
  function pauseVideo(video){
    if(!video.paused){expectedPauses.add(video);video.pause();}
  }
  function pauseStories(){videos.forEach(pauseVideo);}
  function updateAnnouncementMode(){
    // Repeating slides should not interrupt a screen reader every ten seconds.
    announcement.setAttribute('aria-live',automatic?'off':'polite');
  }
  function syncAudio(muted,volume=audio.volume){
    audio={muted,volume};
    videos.forEach(video=>{video.muted=muted;video.volume=volume;});
  }
  function playbackFailed(video,error){
    // A hidden tab or slide change can abort an outstanding play request.
    if(error.name==='AbortError'||video!==videos[active]||!canPlay())return;
    if(error.name==='NotAllowedError'&&!video.muted){
      // Respect browser policy: keep the carousel moving silently until a real
      // visitor interaction permits sound. Never change browser permissions.
      soundBlocked=true;syncAudio(true);
      video.play().catch(failure=>{
        if(failure.name!=='AbortError'&&video===videos[active]&&canPlay())setAutomatic(false);
      });
    }else setAutomatic(false);
  }
  function canPlay(){return automatic&&inView&&!document.hidden&&!document.querySelector('dialog[open]');}
  function playActive(){
    if(!canPlay())return;
    const video=videos[active];
    if(video.ended)video.currentTime=0;
    video.play().catch(error=>playbackFailed(video,error));
  }
  function setAutomatic(enabled){
    automatic=enabled;updateAnnouncementMode();
    if(automatic)playActive();else pauseStories();
  }
  function update(index){
    active=Math.max(0,Math.min(slides.length-1,index));
    slides.forEach((slide,i)=>{
      slide.inert=i!==active;slide.setAttribute('aria-hidden',String(i!==active));
      if(i!==active)pauseVideo(videos[i]);
    });
    dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===active)));
    previous.disabled=active===0;next.disabled=active===slides.length-1;
    section.querySelector('#storyCounter').textContent=`${String(active+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
    announcement.textContent=`Video ${active+1} dari ${slides.length}: ${names[active]}.`;
    playActive();
  }
  function goTo(index){
    const target=Math.max(0,Math.min(slides.length-1,index));
    pauseStories();
    track.scrollTo({left:target*track.clientWidth,behavior:reduced()?'instant':'smooth'});
    if(target===active)playActive();
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
  videos.forEach((video,index)=>{
    video.addEventListener('ended',()=>{if(index===active&&automatic)goTo((active+1)%slides.length);});
    video.addEventListener('pause',()=>{
      if(expectedPauses.has(video)){expectedPauses.delete(video);return;}
      if(index===active&&!video.ended)setAutomatic(false);
    });
    video.addEventListener('play',()=>{
      if(index!==active||!inView||document.hidden){pauseVideo(video);return;}
      if(!automatic){automatic=true;updateAnnouncementMode();}
    });
    video.addEventListener('error',()=>{
      video.closest('.story-media').querySelector('.story-error').hidden=false;
      if(index===active)setAutomatic(false);
    });
    // Keep a visitor's sound/volume choice consistent across both films.
    video.addEventListener('volumechange',()=>{
      if(index===active&&(video.muted!==audio.muted||video.volume!==audio.volume)){
        soundBlocked=false;syncAudio(video.muted,video.volume);
      }
    });
  });
  function enableSoundAfterInteraction(event){
    if(!event.isTrusted||!soundBlocked)return;
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    // Let native player controls honor the visitor's own mute/volume choice.
    if(event.target instanceof Element&&event.target.closest('video'))return;
    soundBlocked=false;syncAudio(false);playActive();
  }
  document.addEventListener('click',enableSoundAfterInteraction,true);
  document.addEventListener('keydown',enableSoundAfterInteraction,true);
  // Only one video on the page may play at a time, including product demos.
  document.addEventListener('play',event=>{
    if(event.target instanceof HTMLVideoElement)document.querySelectorAll('video').forEach(video=>{if(video!==event.target)pauseVideo(video);});
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseStories();else playActive();});
  const dialogs=[...document.querySelectorAll('dialog')];
  const dialogObserver=new MutationObserver(()=>{if(dialogs.some(dialog=>dialog.open))pauseStories();else playActive();});
  dialogs.forEach(dialog=>dialogObserver.observe(dialog,{attributes:true,attributeFilter:['open']}));
  new IntersectionObserver(entries=>{
    inView=entries[0].isIntersecting&&entries[0].intersectionRatio>=.2;
    if(inView)playActive();else pauseStories();
  },{threshold:[0,.2]}).observe(track);
  const respectMotionPreference=()=>{if(reduced())setAutomatic(false);};
  document.querySelector('#motionToggle')?.addEventListener('click',respectMotionPreference);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',respectMotionPreference);
  updateAnnouncementMode();
  update(0);
}

gsap.registerPlugin(ScrollTrigger);
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduceMotion){
  gsap.from('[data-header]',{y:-24,opacity:0,duration:.8,ease:'power3.out'});
  gsap.from('.hero .reveal',{y:28,opacity:0,stagger:.12,duration:1,ease:'power3.out',delay:.2});
  gsap.from('.hero__media',{clipPath:'inset(0 0 100% 0)',duration:1.2,ease:'power4.inOut',delay:.15});
  gsap.utils.toArray('.brand-intro__body,.ecosystem__head,.capabilities__intro,.detail-story__copy,.final-cta__inner').forEach((block)=>gsap.from(block,{y:42,opacity:0,duration:1,ease:'power3.out',scrollTrigger:{trigger:block,start:'top 78%'}}));
  gsap.utils.toArray('.product-line,.capability').forEach((item,index)=>gsap.from(item,{y:24,opacity:0,duration:.65,delay:(index%4)*.06,ease:'power2.out',scrollTrigger:{trigger:item,start:'top 88%'}}));
  gsap.utils.toArray('.motion-frame,.detail-story__media').forEach((media)=>gsap.from(media,{scale:.94,opacity:0,duration:1,scrollTrigger:{trigger:media,start:'top 82%'}}));
  gsap.matchMedia().add('(min-width: 700px)',()=>{
    const panels=gsap.utils.toArray('.story-panel');
    const storyTL=gsap.timeline({scrollTrigger:{trigger:'.wbg-story',start:'top top',end:'bottom bottom',scrub:.7}});
    storyTL.to('.story-media .product-drawing',{scale:1.16,x:-38,duration:1,ease:'none'});
    panels.forEach((panel,index)=>{storyTL.to(panel,{opacity:1,duration:.22},index===0?0:.42+index*.56).to(panel,{opacity:index===panels.length-1?1:.28,duration:.18},index===panels.length-1?'+=.35':'+=.42')});
    storyTL.to('.story-progress span',{width:'100%',duration:1,ease:'none'},0);
  });
}else{document.documentElement.classList.add('reduced-motion');}

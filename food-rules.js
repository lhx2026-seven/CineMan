'use strict';
(function(root) {
  const PRODUCTS=Object.freeze(['吉拿棒','車輪餅','可麗餅','雞蛋糕','滷雞爪','烤玉米','甜不辣','甘蔗','雞米花','熱狗','巧克力','洋芋片','小披薩','蝦餅','精釀啤酒']);
  function draw(seed) {
    const random=root.CinemaRules.seededRandom(`exclusive-food/v1/${seed}`);
    return random()<0.5 ? PRODUCTS[Math.floor(random()*PRODUCTS.length)] : null;
  }
  root.CinemaFood={PRODUCTS,draw};
})(globalThis);

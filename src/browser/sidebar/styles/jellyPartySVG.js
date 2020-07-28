import { interpolate, fromCircle, toCircle } from "flubber";
import * as d3 from "d3";

const jellyfish =
  "M 373.04326,137.07432 C 324.89462,88.925874 252.4831,74.522433 189.57401,100.58028 126.66492,126.63813 85.647061,188.02564 85.647061,256.11797 v 36.07562 c 0,6.64135 5.38387,12.02521 12.02521,12.02521 H 133.7479 v 36.07563 c -0.008,6.63821 -5.38701,12.01764 -12.02521,12.02521 -6.64134,0 -12.0252,5.38387 -12.0252,12.02521 0,6.64135 5.38386,12.02521 12.0252,12.02521 19.91475,-0.0224 36.05326,-16.16088 36.07563,-36.07563 V 304.2188 h 48.10084 v 84.17647 c -0.008,6.63821 -5.38701,12.01764 -12.02521,12.02521 -6.64134,0 -12.0252,5.38387 -12.0252,12.02521 0,6.64135 5.38386,12.02521 12.0252,12.02521 19.91475,-0.0224 36.05326,-16.16088 36.07563,-36.07563 V 304.2188 h 48.10084 v 84.17647 c 0.0224,19.91475 16.16088,36.05327 36.07563,36.07563 6.64134,0 12.0252,-5.38386 12.0252,-12.02521 0,-6.64134 -5.38386,-12.02521 -12.0252,-12.02521 -6.6382,-0.008 -12.01763,-5.387 -12.02521,-12.02521 V 304.2188 h 48.10084 v 36.07563 c 0.0224,19.91475 16.16088,36.05327 36.07563,36.07563 6.64134,0 12.0252,-5.38386 12.0252,-12.02521 0,-6.64134 -5.38386,-12.02521 -12.0252,-12.02521 -6.6382,-0.008 -12.01764,-5.387 -12.02521,-12.02521 V 304.2188 h 36.07563 c 6.64134,0 12.02521,-5.38386 12.02521,-12.02521 v -36.07562 c 0.1221,-44.67427 -17.63378,-87.54059 -49.30968,-119.04365 z";

const arrow = "M 270.55776,98.778502 270.81852,419.96491 435.71728,259.3717 Z";

const eye =
  "m 200.71329,181.91716 c -8.12187,5.95893 -15.25581,13.15838 -21.14025,21.33437 -3.85196,5.39872 -11.34755,6.65967 -16.75391,2.81844 -5.40635,-3.84123 -6.68218,-11.33432 -2.85169,-16.74829 7.34633,-10.27391 16.28511,-19.30968 26.47914,-26.76646 5.34666,-3.93965 12.87468,-2.79903 16.81432,2.54761 3.93964,5.34666 2.79904,12.87468 -2.54761,16.81433 z";

const circleBase = "m 256 256";

const arrowToJellyFishInterpolator = interpolate(arrow, jellyfish);
const jellyFishToArrowInterpolator = interpolate(jellyfish, arrow);
const circleToEyeInterpolator = fromCircle(183, 155, 0, eye);
const eyeToCircleInterpolator = toCircle(eye, 183, 155, 0);
const nothingToCircle = toCircle(circleBase, 256, 256, 256);
const circleToNothing = fromCircle(256, 256, 0, circleBase);

const arrowToJellyFish = function() {
  d3.select("#path1337")
    .transition()
    .duration(1000)
    .attrTween("d", function() {
      return nothingToCircle;
    });
  d3.select("#jellyPartyFab")
    .transition()
    .style("position", "absolute")
    .style("top", "")
    .style("bottom", "100px")
    .style("right", "")
    .style("left", "-70px")
    .duration(1000);
  d3.select("#path850")
    .transition()
    .duration(1000)
    .attrTween("d", function() {
      return arrowToJellyFishInterpolator;
    })
    .end()
    .then(() => {
      d3.select("#path1619")
        .transition()
        .ease(d3.easeCubic)
        .duration(300)
        .attrTween("d", function() {
          return circleToEyeInterpolator;
        });
    });
};

const jellyFishToArrow = function() {
  d3.select("#path1337")
    .transition()
    .duration(1000)
    .attrTween("d", function() {
      return circleToNothing;
    });
  d3.select("#jellyPartyFab")
    .transition()
    .style("position", "absolute")
    .style("top", "4px")
    .style("bottom", "")
    .style("right", "310px")
    .style("left", "")
    .duration(1000);
  d3.select("#path1619")
    .transition()
    .ease(d3.easeCubic)
    .duration(300)
    .attrTween("d", function() {
      return eyeToCircleInterpolator;
    })
    .end()
    .then(() => {
      d3.select("#path850")
        .transition()
        .duration(1000)
        .attrTween("d", function() {
          return jellyFishToArrowInterpolator;
        });
    });
};
const baseSVG = `
<svg
   id="jellyPartyFabSVG"
   version="1.1"
   viewBox="0 0 512 512"
   height="48px"
   width="48px">
  <defs
     id="defs2">
    <style
       id="style835">
        .cls-1 {
            fill: #fff;
        }
        .blue-gradient {
            fill: url(#linear-gradient);
        }
    </style>
    <linearGradient
       id="linear-gradient"
       x1="32"
       y1="256"
       x2="480"
       y2="256"
       gradientUnits="userSpaceOnUse">
      <stop
         offset="0"
         stop-color="#9164ff"
         id="stop837" />
      <stop
         offset="0.725"
         stop-color="#8bfff4"
         id="stop839" />
      <stop
         offset="1"
         stop-color="#8bfff4"
         id="stop841" />
    </linearGradient>
    <linearGradient
       id="circle-gradient"
       x1="32"
       y1="256"
       x2="480"
       y2="256"
       gradientUnits="userSpaceOnUse">
      <stop
         offset="0"
         stop-color="#ff9494"
         id="stop837" />
      <stop
         offset="0.725"
         stop-color="#ee64f6"
         id="stop839" />
      <stop
         offset="1"
         stop-color="#ee64f6"
         id="stop841" />
    </linearGradient>
  </defs>
  <sodipodi:namedview
     borderopacity="1.0"
     bordercolor="#666666"
     pagecolor="#ffffff"
     id="base" />
  <g
     id="layer1"
     inkscape:groupmode="layer"
     inkscape:label="Layer 1">
    <g
       id="Layer_3"
       data-name="Layer 3">
       <path
         id="path1337"
         style="fill:url(#circle-gradient)"
         d=""/>
      <path
         style="fill:url(#linear-gradient)"
         inkscape:connector-curvature="0"
         class="blue-gradient"
         d="M 270.55776,98.778502 270.81852,419.96491 435.71728,259.3717 Z"
         id="path850"
         sodipodi:nodetypes="csssscccsccccccsccccccsccccccscccssccccsccsc" />
      <path
         sodipodi:nodetypes="ccsccsc"
         inkscape:connector-curvature="0"
         id="path1619"
         d=""
         style="fill:#ffffff;stroke:none;stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;fill-opacity:1" />
    </g>
  </g>
</svg>
`;

const jellyFishWithNotification = `
<svg id="jellyPartyFabSVG" version="1.1" viewBox="0 0 512 512" height="48px" width="48px">
  <defs id="defs2">
    <style id="style835">
        .cls-1 {
            fill: #fff;
        }
        .blue-gradient {
            fill: url(#linear-gradient);
        }
    </style>
    <linearGradient id="linear-gradient" x1="32" y1="256" x2="480" y2="256" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#9164ff" id="stop837"></stop>
      <stop offset="0.725" stop-color="#8bfff4" id="stop839"></stop>
      <stop offset="1" stop-color="#8bfff4" id="stop841"></stop>
    </linearGradient>
    <linearGradient id="circle-gradient" x1="32" y1="256" x2="480" y2="256" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ff9494" id="stop837"></stop>
      <stop offset="0.725" stop-color="#ee64f6" id="stop839"></stop>
      <stop offset="1" stop-color="#ee64f6" id="stop841"></stop>
    </linearGradient>
  </defs>
  <sodipodi:namedview borderopacity="1.0" bordercolor="#666666" pagecolor="#ffffff" id="base"></sodipodi:namedview>
  <g id="layer1" inkscape:groupmode="layer" inkscape:label="Layer 1">
    <g id="Layer_3" data-name="Layer 3">
       <path id="path1337" style="fill:url(#circle-gradient)" d="M0,256A256,256,0,1,1,512,256A256,256,0,1,1,0,256Z"></path>
      <path style="fill:url(#linear-gradient)" inkscape:connector-curvature="0" class="blue-gradient" d="M 373.04326,137.07432 C 324.89462,88.925874 252.4831,74.522433 189.57401,100.58028 126.66492,126.63813 85.647061,188.02564 85.647061,256.11797 v 36.07562 c 0,6.64135 5.38387,12.02521 12.02521,12.02521 H 133.7479 v 36.07563 c -0.008,6.63821 -5.38701,12.01764 -12.02521,12.02521 -6.64134,0 -12.0252,5.38387 -12.0252,12.02521 0,6.64135 5.38386,12.02521 12.0252,12.02521 19.91475,-0.0224 36.05326,-16.16088 36.07563,-36.07563 V 304.2188 h 48.10084 v 84.17647 c -0.008,6.63821 -5.38701,12.01764 -12.02521,12.02521 -6.64134,0 -12.0252,5.38387 -12.0252,12.02521 0,6.64135 5.38386,12.02521 12.0252,12.02521 19.91475,-0.0224 36.05326,-16.16088 36.07563,-36.07563 V 304.2188 h 48.10084 v 84.17647 c 0.0224,19.91475 16.16088,36.05327 36.07563,36.07563 6.64134,0 12.0252,-5.38386 12.0252,-12.02521 0,-6.64134 -5.38386,-12.02521 -12.0252,-12.02521 -6.6382,-0.008 -12.01763,-5.387 -12.02521,-12.02521 V 304.2188 h 48.10084 v 36.07563 c 0.0224,19.91475 16.16088,36.05327 36.07563,36.07563 6.64134,0 12.0252,-5.38386 12.0252,-12.02521 0,-6.64134 -5.38386,-12.02521 -12.0252,-12.02521 -6.6382,-0.008 -12.01764,-5.387 -12.02521,-12.02521 V 304.2188 h 36.07563 c 6.64134,0 12.02521,-5.38386 12.02521,-12.02521 v -36.07562 c 0.1221,-44.67427 -17.63378,-87.54059 -49.30968,-119.04365 z" id="path850" sodipodi:nodetypes="csssscccsccccccsccccccsccccccscccssccccsccsc"></path>
      <path sodipodi:nodetypes="ccsccsc" inkscape:connector-curvature="0" id="path1619" d="M200.71328735351562,181.9171600341797L193.2950439453125,187.9503936767578L186.5133514404297,194.69119262695312L180.4352569580078,202.07272338867188L173.07443237304688,207.8338623046875L163.82705688476562,206.71412658691406L158.15415954589844,199.32603454589844L159.45823669433594,190.10302734375L165.23989868164062,182.48812866210938L171.64402770996094,175.38580322265625L178.59901428222656,168.82192993164062L186.0599365234375,162.83935546875L195.02481079101562,160.29800415039062L203.11668395996094,164.91111755371094L205.48680114746094,173.91891479492188Z" style="fill:#ffffff;stroke:none;stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;fill-opacity:1"></path>
    </g>
  </g>
  <circle
     r="74.641174"
     cy="79.76474"
     cx="433.47668"
     id="path96"
     style="fill:#d45a6b;fill-opacity:1;stroke:none;stroke-width:8.1362896;stroke-opacity:1" />
</svg>
`;

const jellyFishWithoutNotification = `
<svg id="jellyPartyFabSVG" version="1.1" viewBox="0 0 512 512" height="48px" width="48px">
  <defs id="defs2">
    <style id="style835">
        .cls-1 {
            fill: #fff;
        }
        .blue-gradient {
            fill: url(#linear-gradient);
        }
    </style>
    <linearGradient id="linear-gradient" x1="32" y1="256" x2="480" y2="256" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#9164ff" id="stop837"></stop>
      <stop offset="0.725" stop-color="#8bfff4" id="stop839"></stop>
      <stop offset="1" stop-color="#8bfff4" id="stop841"></stop>
    </linearGradient>
    <linearGradient id="circle-gradient" x1="32" y1="256" x2="480" y2="256" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ff9494" id="stop837"></stop>
      <stop offset="0.725" stop-color="#ee64f6" id="stop839"></stop>
      <stop offset="1" stop-color="#ee64f6" id="stop841"></stop>
    </linearGradient>
  </defs>
  <sodipodi:namedview borderopacity="1.0" bordercolor="#666666" pagecolor="#ffffff" id="base"></sodipodi:namedview>
  <g id="layer1" inkscape:groupmode="layer" inkscape:label="Layer 1">
    <g id="Layer_3" data-name="Layer 3">
       <path id="path1337" style="fill:url(#circle-gradient)" d="M0,256A256,256,0,1,1,512,256A256,256,0,1,1,0,256Z"></path>
      <path style="fill:url(#linear-gradient)" inkscape:connector-curvature="0" class="blue-gradient" d="M 373.04326,137.07432 C 324.89462,88.925874 252.4831,74.522433 189.57401,100.58028 126.66492,126.63813 85.647061,188.02564 85.647061,256.11797 v 36.07562 c 0,6.64135 5.38387,12.02521 12.02521,12.02521 H 133.7479 v 36.07563 c -0.008,6.63821 -5.38701,12.01764 -12.02521,12.02521 -6.64134,0 -12.0252,5.38387 -12.0252,12.02521 0,6.64135 5.38386,12.02521 12.0252,12.02521 19.91475,-0.0224 36.05326,-16.16088 36.07563,-36.07563 V 304.2188 h 48.10084 v 84.17647 c -0.008,6.63821 -5.38701,12.01764 -12.02521,12.02521 -6.64134,0 -12.0252,5.38387 -12.0252,12.02521 0,6.64135 5.38386,12.02521 12.0252,12.02521 19.91475,-0.0224 36.05326,-16.16088 36.07563,-36.07563 V 304.2188 h 48.10084 v 84.17647 c 0.0224,19.91475 16.16088,36.05327 36.07563,36.07563 6.64134,0 12.0252,-5.38386 12.0252,-12.02521 0,-6.64134 -5.38386,-12.02521 -12.0252,-12.02521 -6.6382,-0.008 -12.01763,-5.387 -12.02521,-12.02521 V 304.2188 h 48.10084 v 36.07563 c 0.0224,19.91475 16.16088,36.05327 36.07563,36.07563 6.64134,0 12.0252,-5.38386 12.0252,-12.02521 0,-6.64134 -5.38386,-12.02521 -12.0252,-12.02521 -6.6382,-0.008 -12.01764,-5.387 -12.02521,-12.02521 V 304.2188 h 36.07563 c 6.64134,0 12.02521,-5.38386 12.02521,-12.02521 v -36.07562 c 0.1221,-44.67427 -17.63378,-87.54059 -49.30968,-119.04365 z" id="path850" sodipodi:nodetypes="csssscccsccccccsccccccsccccccscccssccccsccsc"></path>
      <path sodipodi:nodetypes="ccsccsc" inkscape:connector-curvature="0" id="path1619" d="M200.71328735351562,181.9171600341797L193.2950439453125,187.9503936767578L186.5133514404297,194.69119262695312L180.4352569580078,202.07272338867188L173.07443237304688,207.8338623046875L163.82705688476562,206.71412658691406L158.15415954589844,199.32603454589844L159.45823669433594,190.10302734375L165.23989868164062,182.48812866210938L171.64402770996094,175.38580322265625L178.59901428222656,168.82192993164062L186.0599365234375,162.83935546875L195.02481079101562,160.29800415039062L203.11668395996094,164.91111755371094L205.48680114746094,173.91891479492188Z" style="fill:#ffffff;stroke:none;stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;fill-opacity:1"></path>
    </g>
  </g>
</svg>
`;


const closeButton = `<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="times" class="svg-inline--fa fa-times fa-w-11" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 512"><path fill="currentColor" d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>`;

export {
  baseSVG,
  jellyFishWithNotification,
  jellyFishWithoutNotification,
  jellyFishToArrow,
  arrowToJellyFish,
  closeButton,
  jellyfish
};

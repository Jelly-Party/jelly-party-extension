import Vue from "vue";
import VueRouter from "vue-router";
import Home from "../views/Home.vue";
import Party from "../views/Party.vue";
import CustomizeAvatar from "../views/CustomizeAvatar.vue";

Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home
  },
  {
    path: "/party",
    name: "Party",
    component: Party
  },
  {
    path: "/settings",
    name: "Settings",
    // route level code-splitting
    // this generates a separate chunk (settings.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import(/* webpackChunkName: "settings" */ "../views/Settings.vue")
  },
  {
    path: "/customizeAvatar",
    name: "CustomizeAvatar",
    component: CustomizeAvatar
  }
];

const router = new VueRouter({
  routes
});

export default router;

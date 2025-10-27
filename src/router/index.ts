import { createWebHashHistory, createRouter } from "vue-router";
import { type RouteRecordRaw } from "vue-router";

import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useI18n } from "@/hooks/useI18n";

const { t } = useI18n();
NProgress.configure({ showSpinner: false });

/* Layout */
export const Layout = () => import("@/layout/index.vue");

// 公共路由
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: "",
    component: Layout,
    redirect: "/project",
    children: [
      {
        path: "/project",
        component: () => import("@/views/project/index.vue"),
        name: "Project",
        meta: {
          title: t("menu.project")
        }
      },
      {
        path: "/preview/:id",
        component: () => import("@/views/preview/index.vue"),
        name: "Preview",
        meta: {
          title: t("menu.preview")
        }
      },
      {
        path: "/config",
        component: () => import("@/views/config/index.vue"),
        name: "Config",
        meta: {
          title: t("menu.config")
        }
      }
    ]
  },
  {
    path: "/404",
    component: () => import("@/views/error/404.vue"),
    meta: {
      title: "404"
    },
    alias: "/:pathMatch(.*)*"
  }
];

const router = createRouter({
  history: createWebHashHistory("/"),
  routes: constantRoutes,
  scrollBehavior: () => ({ left: 0, top: 0 })
});

router.beforeEach((_to: any, _from, next) => {
  NProgress.start();
  next();
});

router.afterEach(() => {
  NProgress.done();
});

export default router;

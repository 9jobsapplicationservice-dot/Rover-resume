export const clerkAppearance = {
  unsafe_disableDevelopmentModeWarnings: true,
  elements: {
    footer: { display: "none" },
    footerItem: { display: "none" },
    footerAction: { display: "none" },
    footerActionText: { display: "none" },
    footerActionLink: { display: "none" },
    footerPages: { display: "none" },
    footerPagesLink: { display: "none" },
    badge: { display: "none" },
    cardBox: {
      "& > div:nth-child(n + 2)": { display: "none" },
    },
  },
};

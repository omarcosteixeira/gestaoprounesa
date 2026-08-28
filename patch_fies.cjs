const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update frontend filter in FiesProuniView
const frontendDataFilter = `    if (
      profile.role !== ROLES.ADMIN_MASTER &&
      profile.role !== ROLES.GESTOR_COMERCIAL &&
      profile.role !== ROLES.GESTOR_COMERCIAL_COMERCIAL
    ) {
      if (profile.unidade && item.unidade && item.unidade !== profile.unidade) {
        return false;
      }
    }`;
const frontendDataFilterReplacement = `    if (
      profile.role !== ROLES.ADMIN_MASTER &&
      profile.role !== ROLES.GESTOR_COMERCIAL &&
      profile.role !== ROLES.GESTOR_COMERCIAL_COMERCIAL &&
      profile.role !== ROLES.SSA
    ) {
      if (profile.unidade && item.unidade && item.unidade !== profile.unidade) {
        return false;
      }
    }`;
code = code.replaceAll(frontendDataFilter, frontendDataFilterReplacement);

// Update database query filter for FiesProuni
const backendFilter = `    if (profile && VIEW_PERMISSIONS.fiesProuni.includes(profile.role)) {
      const isRestricted =
        profile.role !== ROLES.ADMIN_MASTER &&
        profile.role !== ROLES.GESTOR_COMERCIAL &&
        profile.role !== ROLES.GESTOR_COMERCIAL_COMERCIAL &&
        profile.role !== ROLES.LIDER_FDV &&
        !["canaldonutri@gmail.com", "marcos.teixeira@estacio.br"].includes(
          user?.email || "",
        );`;
const backendFilterReplacement = `    if (profile && VIEW_PERMISSIONS.fiesProuni.includes(profile.role)) {
      const isRestricted =
        profile.role !== ROLES.ADMIN_MASTER &&
        profile.role !== ROLES.GESTOR_COMERCIAL &&
        profile.role !== ROLES.GESTOR_COMERCIAL_COMERCIAL &&
        profile.role !== ROLES.LIDER_FDV &&
        profile.role !== ROLES.SSA &&
        !["canaldonutri@gmail.com", "marcos.teixeira@estacio.br"].includes(
          user?.email || "",
        );`;
code = code.replace(backendFilter, backendFilterReplacement);

fs.writeFileSync('src/App.tsx', code, 'utf8');
console.log("App.tsx patched");

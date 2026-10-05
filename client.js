window.__ModuleLoader__.load({
  id: '@stolyarovmn/dsh-ui-registry-aggregator',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'registryAggregator'
    const PACKAGE = '@stolyarovmn/dsh-ui-registry-aggregator'
    const CHANNEL = '/api'
    const RPC_PREFIX = 'plugin-sources'
    const HOST_ENTRY = 'registry-aggregator'
    const SOURCE_TYPES = ['npm', 'github', 'custom-json', 'corporate']
    let connection
    let remote
    let sourceConfigForm

    const en = {
      sources: 'Sources',
      browse: 'Browse',
      updates: 'Updates',
      sourcesTitle: 'Connected sources',
      sourcesLead: 'Manage the registries and catalogs used for plugin discovery.',
      sourceAdd: 'Add source',
      sourceAddTitle: 'Add a new source',
      sourceName: 'Name',
      sourceType: 'Type',
      sourceUrl: 'Catalog / API URL',
      sourceUrlHint: 'Optional for npm and GitHub',
      sourceSave: 'Add',
      sourceCancel: 'Cancel',
      sourceRemove: 'Remove',
      sourceRefresh: 'Refresh',
      sourceEnabled: 'Enabled',
      sourceDisabled: 'Disabled',
      sourceChecking: 'Checking',
      sourceOnline: 'Online',
      sourceOffline: 'Unavailable',
      sourcePackages: '{count} packages',
      sourceRepositories: '{count} repositories',
      sourceItems: '{count} items',
      sourceCounting: 'Counting…',
      sourceLatency: '{value} ms',
      sourceEmpty: 'No plugin sources connected.',
      sourceRequired: 'Name is required.',
      sourceUrlRequired: 'This source type requires a catalog URL.',
      sourceDuplicate: 'A source with this id already exists.',
      sourceReadOnly: 'Plugin source configuration is read-only.',
      sourceUnavailable: 'Plugin source configuration is unavailable.',
      sourceSaveFailed: 'Could not save source configuration.',
      sourceCopy: 'Copy source address',
      copied: 'Copied',
      browseTitle: 'Browse plugins',
      browseLead: 'Search enabled registries and catalogs.',
      browsePlaceholder: 'Search plugins',
      browseRefresh: 'Refresh results',
      browseLoading: 'Searching plugins…',
      browsePopular: 'Popular plugins',
      browseResults: '{count} results',
      browseNoResults: 'No plugins found',
      browseNoResultsBody: 'Try another query or enable another source.',
      browseSourceFailures: 'Some sources could not be searched.',
      install: 'Install',
      installing: 'Installing…',
      installed: 'Installed',
      installRetry: 'Retry install',
      installChecking: 'Checking package…',
      installFailed: 'Install failed',
      installNotBundle: 'Not a DSH bundle',
      installAlready: 'Already installed',
      installApproval: 'Build-script approval is required; use the native Add plugin dialog to review and approve it.',
      compatible: 'Compatible',
      incompatible: 'Incompatible',
      notVerified: 'Not verified',
      compatibilityTitle: 'DSH {version} compatibility',
      incompatibleTitle: 'Not compatible with DSH {version}',
      filterCompatibility: 'Compatibility',
      compatibilityAll: 'Any',
      compatibilityCompatible: 'Compatible only',
      compatibilityIncompatible: 'Incompatible',
      compatibilityUnverified: 'Not verified',
      compatibilityChecking: 'Checking compatibility…',
      updateChecking: 'Checking installed plugins…',
      updateAvailable: '{installed} → {available}',
      updateAction: 'Update to {version}',
      updateRetry: 'Retry update',
      updateFailed: 'Update failed',
      updateNone: 'Installed plugins are up to date',
      updateNoneBody: 'No newer package versions were found in the connected registries.',
      updateRefresh: 'Check for updates',
      downloads30d: 'npm downloads in the last 30 days',
      downloadsTotal: 'npm total downloads',
      filterSource: 'Source',
      filterAllSources: 'All',
      filterSort: 'Sort',
      sortRelevance: 'Relevance',
      sortStars: 'Stars',
      sortDownloads: 'Downloads',
      sortFreshness: 'Freshness',
      sortName: 'Name',
      sortPriority: 'Sort priority {priority}',
      sortOff: 'Not active',
      sortAsc: 'Ascending',
      sortDesc: 'Descending',
      sortCombined: 'Combined equally with other active criteria',
      filterRelease: 'Release',
      releaseAll: 'All',
      releaseStable: 'Stable only',
      releasePrerelease: 'Pre-release only',
      filterFreshness: 'Updated',
      freshnessAny: 'Any',
      freshness30: 'Last 30 days',
      freshness90: 'Last 90 days',
      freshness365: 'Last year',
      filterTag: 'Tag',
      filterAllTags: 'All',
      pageSize: 'Per page',
      previousPage: 'Previous page',
      nextPage: 'Next page',
      updated: 'updated {value}',
      released: 'released {value}',
      repoUpdated: 'repo {value}',
      prerelease: 'pre-release',
      updatesTitle: 'Plugin updates',
      updatesLead: 'Update discovery complements the native DSH Plugin Manager instead of replacing it.',
      updatesEmptyTitle: 'Update discovery is not connected yet',
      updatesEmptyBody: 'Installed bundle lifecycle remains native to DSH.',
    }

    const zh = {
      sources: '来源',
      browse: '浏览',
      updates: '更新',
      sourcesTitle: '已连接来源',
      sourcesLead: '管理用于发现插件的注册表与目录。',
      sourceAdd: '添加来源',
      sourceAddTitle: '添加新来源',
      sourceName: '名称',
      sourceType: '类型',
      sourceUrl: '目录 / API URL',
      sourceUrlHint: 'npm 和 GitHub 可留空',
      sourceSave: '添加',
      sourceCancel: '取消',
      sourceRemove: '删除',
      sourceRefresh: '刷新',
      sourceEnabled: '已启用',
      sourceDisabled: '已停用',
      sourceChecking: '检查中',
      sourceOnline: '在线',
      sourceOffline: '不可用',
      sourcePackages: '{count} 个包',
      sourceRepositories: '{count} 个仓库',
      sourceItems: '{count} 项',
      sourceCounting: '统计中…',
      sourceLatency: '{value} 毫秒',
      sourceEmpty: '没有已连接的插件来源。',
      sourceRequired: '名称不能为空。',
      sourceUrlRequired: '此来源类型需要目录 URL。',
      sourceDuplicate: '已存在相同 id 的来源。',
      sourceReadOnly: '插件来源配置为只读。',
      sourceUnavailable: '插件来源配置不可用。',
      sourceSaveFailed: '无法保存来源配置。',
      sourceCopy: '复制来源地址',
      copied: '已复制',
      browseTitle: '浏览插件',
      browseLead: '搜索已启用的注册表和目录。',
      browsePlaceholder: '搜索插件',
      browseRefresh: '刷新结果',
      browseLoading: '正在搜索插件…',
      browsePopular: '热门插件',
      browseResults: '{count} 个结果',
      browseNoResults: '未找到插件',
      browseNoResultsBody: '尝试其他关键词或启用其他来源。',
      browseSourceFailures: '部分来源无法搜索。',
      install: '安装',
      installing: '正在安装…',
      installed: '已安装',
      installRetry: '重试安装',
      installChecking: '正在检查包…',
      installFailed: '安装失败',
      installNotBundle: '不是 DSH bundle',
      installAlready: '已安装',
      installApproval: '需要批准依赖构建脚本；请使用原生“添加插件”对话框检查并批准。',
      compatible: '兼容',
      incompatible: '不兼容',
      notVerified: '未验证',
      compatibilityTitle: 'DSH {version} 兼容性',
      incompatibleTitle: '与 DSH {version} 不兼容',
      filterCompatibility: '兼容性',
      compatibilityAll: '不限',
      compatibilityCompatible: '仅兼容',
      compatibilityIncompatible: '不兼容',
      compatibilityUnverified: '未验证',
      compatibilityChecking: '正在检查兼容性…',
      updateChecking: '正在检查已安装插件…',
      updateAvailable: '{installed} → {available}',
      updateAction: '更新到 {version}',
      updateRetry: '重试更新',
      updateFailed: '更新失败',
      updateNone: '已安装插件均为最新版本',
      updateNoneBody: '在已连接的注册表中没有发现更高版本。',
      updateRefresh: '检查更新',
      downloads30d: 'npm 最近 30 天下载量',
      downloadsTotal: 'npm 总下载量',
      filterSource: '来源',
      filterAllSources: '全部',
      filterSort: '排序',
      sortRelevance: '相关度',
      sortStars: 'Stars',
      sortDownloads: '下载量',
      sortFreshness: '新鲜度',
      sortName: '名称',
      sortPriority: '排序优先级 {priority}',
      sortOff: '未启用',
      sortAsc: '升序',
      sortDesc: '降序',
      sortCombined: '与其他启用条件等权组合',
      filterRelease: '版本',
      releaseAll: '全部',
      releaseStable: '仅稳定版',
      releasePrerelease: '仅预发布版',
      filterFreshness: '更新时间',
      freshnessAny: '不限',
      freshness30: '最近 30 天',
      freshness90: '最近 90 天',
      freshness365: '最近一年',
      filterTag: '标签',
      filterAllTags: '全部',
      pageSize: '每页',
      previousPage: '上一页',
      nextPage: '下一页',
      updated: '{value}前更新',
      released: '{value}前发布',
      repoUpdated: '仓库 {value}',
      prerelease: '预发布',
      updatesTitle: '插件更新',
      updatesLead: '更新发现用于补充原生 DSH Plugin Manager，而不是替代它。',
      updatesEmptyTitle: '更新发现尚未连接',
      updatesEmptyBody: '已安装 bundle 的生命周期继续由 DSH 原生管理。',
    }

    const css = [
      '.ra-root{box-sizing:border-box;min-width:0;max-width:100%;overflow-x:hidden;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;padding:2px 0 8px}',
      '.ra-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:min(100%,440px);padding:4px;margin:12px 0 24px;border-radius:12px;background:var(--dsw-alias-bg-module-platform,var(--dsw-alias-bg-layer-2))}',
      '.ra-tab{height:34px;padding:0 14px;border:.5px solid transparent;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer}',
      '.ra-tab:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.ra-tab:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}',
      '.ra-tab[aria-selected=true]{border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-primary);font-weight:600}',
      '.ra-section{display:grid;gap:14px;box-sizing:border-box;min-width:0;max-width:100%;overflow:hidden}',
      '.ra-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}',
      '.ra-heading{margin:0;font-size:14px;line-height:20px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.ra-lead{margin:2px 0 0;color:var(--dsw-alias-label-tertiary)}',
      '.ra-actions{display:flex;align-items:center;gap:8px;flex:none}',
      '.ra-button{box-sizing:border-box;min-height:32px;padding:0 11px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer}',
      '.ra-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.ra-button:focus-visible,.ra-input:focus-visible,.ra-select:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}',
      '.ra-button:disabled{opacity:.5;cursor:not-allowed}',
      '.ra-button-primary{background:var(--dsw-alias-state-business-primary);border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary-foreground)}',
      '.ra-panel{border:.5px solid var(--dsw-alias-border-l4);border-radius:12px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}',
      '.ra-add-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px}',
      '.ra-add-form{display:grid;grid-template-columns:minmax(160px,1fr) minmax(130px,180px) minmax(220px,1.2fr) auto;gap:10px;padding:12px 13px;border-top:.5px solid var(--dsw-alias-border-l4);align-items:end}',
      '.ra-field{display:grid;gap:4px;min-width:0}',
      '.ra-field label{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.ra-input,.ra-select{box-sizing:border-box;width:100%;height:34px;padding:0 9px;border:.5px solid var(--dsw-alias-border-l4);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit}',
      '.ra-form-actions{display:flex;align-items:center;gap:6px}',
      '.ra-error{grid-column:1/-1;margin:0;color:var(--dsw-alias-state-error-primary);font-size:12px}',
      '.ra-notice{margin:0;padding:9px 12px;border:.5px solid var(--dsw-alias-border-l4);border-radius:8px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1)}',
      '.ra-source-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
      '.ra-source-card{min-width:0;padding:12px;border:.5px solid var(--dsw-alias-border-l4);border-radius:12px;background:transparent}',
      '.ra-source-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}',
      '.ra-source-main{display:flex;align-items:flex-start;gap:10px;min-width:0}',
      '.ra-source-logo{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border:.5px solid var(--dsw-alias-border-l4);border-radius:10px;color:var(--dsw-alias-label-secondary)}',
      '.ra-source-copy{min-width:0}',
      '.ra-source-name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.ra-source-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:2px;color:var(--dsw-alias-label-tertiary);font-size:11px}',
      '.ra-status{display:inline-flex;align-items:center;gap:5px}',
      '.ra-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}',
      '.ra-dot[data-state=ok]{background:var(--dsw-alias-state-success-primary)}',
      '.ra-dot[data-state=bad]{background:var(--dsw-alias-state-error-primary)}',
      '.ra-dot[data-state=wait]{background:var(--dsw-alias-state-warn-primary)}',
      '.ra-source-controls{display:flex;align-items:center;gap:6px;flex:none}',
      '.ra-icon-button{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-caption);font:inherit;cursor:pointer}',
      '.ra-icon-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}',
      '.ra-icon-button:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}',
      '.ra-icon-button:disabled{opacity:.5;cursor:default}',
      '.ra-icon-button[data-danger=true]{color:var(--dsw-alias-state-error-primary)}',
      '.ra-icon-button[data-danger=true]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger,var(--dsw-alias-interactive-bg-hover))}',
      '.ra-icon-button[data-state=done]{color:var(--dsw-alias-state-success-primary)}',
      '.ra-icon-button[data-state=error]{color:var(--dsw-alias-state-error-primary)}',
      '.ra-switch{box-sizing:border-box;position:relative;flex:0 0 auto;width:36px;height:20px;padding:2px;border:0;border-radius:999px;corner-shape:round;background:var(--dsw-alias-border-l3);cursor:pointer}',
      '.ra-switch[aria-checked=true]{background:var(--dsw-alias-brand-primary)}',
      '.ra-switch:disabled{cursor:default;opacity:.5}',
      '.ra-switch:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.ra-switch-thumb{display:block;width:16px;height:16px;border-radius:50%;corner-shape:round;background:var(--dsw-alias-switch-thumb);transition:transform 120ms ease}',
      '.ra-switch[aria-checked=true] .ra-switch-thumb{transform:translateX(16px);background:var(--dsw-alias-label-primary-foreground)}',
      '.ra-source-url{display:flex;align-items:center;gap:4px;margin-top:10px;padding-top:9px;border-top:.5px solid var(--dsw-alias-border-l4)}',
      '.ra-source-url code{min-width:0;flex:1;color:var(--dsw-alias-label-tertiary);font:11px/17px ui-monospace,SFMono-Regular,Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.ra-meta-icon{display:inline-flex;align-items:center;gap:4px}',
      '.ra-spin{animation:ra-spin .8s linear infinite}',
      '@keyframes ra-spin{to{transform:rotate(360deg)}}',
      '.ra-source-error{margin-top:7px;color:var(--dsw-alias-state-error-primary);font-size:11px;line-height:16px}',
      '.ra-empty{padding:18px;border:.5px solid var(--dsw-alias-border-l4);border-radius:12px;color:var(--dsw-alias-label-tertiary)}',
      '.ra-empty strong{display:block;margin-bottom:3px;color:var(--dsw-alias-label-primary)}',
      '.ra-search{box-sizing:border-box;min-width:0;max-width:100%;width:100%;height:36px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit}',
      '.ra-search::placeholder{color:var(--dsw-alias-label-caption)}',
      '.ra-filter-row{display:flex;align-items:center;gap:5px;flex-wrap:nowrap;min-width:0;max-width:100%}',
      '.ra-compact-filter{box-sizing:border-box;display:inline-flex;align-items:center;gap:4px;height:30px;padding:0 4px 0 7px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary);flex:0 0 auto;min-width:0}',
      '.ra-compact-filter[data-active=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l4)}',
      '.ra-compact-filter-icon{display:inline-flex;align-items:center;justify-content:center;flex:0 0 14px;width:14px;height:14px}',
      '.ra-compact-filter select{box-sizing:border-box;height:27px;min-width:0;padding:0 18px 0 2px;border:0;outline:0;background:transparent;color:var(--dsw-alias-label-secondary);font:500 11px/1 inherit;color-scheme:light dark}',
      '.ra-compact-filter[data-kind=source] select{width:78px}',
      '.ra-compact-filter[data-kind=release] select{width:78px}',
      '.ra-compact-filter[data-kind=freshness] select{width:72px}',
      '.ra-compact-filter[data-kind=tag] select{width:78px}',
      '.ra-compact-filter[data-kind=compatibility] select{width:88px}',
      '.ra-compact-filter[data-kind=page] select{width:58px}',
      '.ra-compact-filter select option,.ra-select option{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.ra-sort-row{display:inline-flex;align-items:center;gap:3px;padding:2px;border:.5px solid var(--dsw-alias-border-l3);border-radius:9px;background:var(--dsw-alias-bg-module-platform,var(--dsw-alias-bg-layer-2))}',
      '.ra-sort-criterion{position:relative;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:3px;min-width:30px;height:26px;padding:0 6px;border:.5px solid transparent;border-radius:7px;background:transparent;color:var(--dsw-alias-label-tertiary);font:600 11px/1 inherit;cursor:pointer}',
      '.ra-sort-criterion:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}',
      '.ra-sort-criterion[data-active=true]{border-color:var(--dsw-alias-border-l3);background:color-mix(in srgb,var(--dsw-alias-label-primary) 9%,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-primary)}',
      '.ra-sort-criterion:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}',
      '.ra-sort-symbol{display:inline-flex;align-items:center;justify-content:center;min-width:14px;height:14px}',
      '.ra-sort-direction{display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-caption);font-size:9px;line-height:1}',
      '.ra-sort-criterion[data-active=true] .ra-sort-direction{color:var(--dsw-alias-brand-primary)}',
      '.ra-star{color:var(--dsw-alias-state-warn-primary);font-weight:800}',
      '.ra-browse-list{display:flex;flex-direction:column;gap:2px;box-sizing:border-box;min-width:0;max-width:100%;margin:0;padding:0;overflow:hidden;list-style:none}',
      '.ra-plugin-card{display:flex;align-items:center;gap:14px;box-sizing:border-box;min-width:0;max-width:100%;width:100%;margin:0;padding:8px;border-radius:var(--dsw-radius-xl);flex-wrap:wrap}',
      '.ra-plugin-card:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.ra-plugin-icon{display:inline-flex;align-items:center;justify-content:center;flex:none;width:40px;height:40px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);color:var(--dsw-alias-label-secondary);overflow:hidden}',
      '.ra-plugin-image{display:block;width:30px;height:30px;object-fit:contain;border-radius:6px}',
      '.ra-plugin-main{display:flex;flex:1;flex-direction:column;gap:2px;min-width:0}',
      '.ra-plugin-title-row{display:flex;align-items:center;gap:8px;min-width:0}',
      '.ra-plugin-title{font-size:13.5px;line-height:20px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ra-plugin-version{display:inline-flex;align-items:center;flex:none;font:600 10.5px/16px ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--dsw-alias-label-secondary)}',
      '.ra-plugin-desc{font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-tertiary);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}',
      '.ra-plugin-meta{display:flex;align-items:center;gap:9px;flex-wrap:wrap;min-width:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-caption)}',
      '.ra-plugin-stats{display:flex;align-items:center;gap:9px;flex-wrap:wrap;min-width:0;margin-top:1px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-caption)}',
      '.ra-plugin-tags{display:flex;align-items:center;gap:5px;flex-wrap:wrap;min-width:0;margin-top:2px}',
      '.ra-plugin-meta-item{display:inline-flex;align-items:center;gap:4px;min-width:0;white-space:nowrap}',
      '.ra-source-mark{display:inline-flex;align-items:center;justify-content:center;flex:none;color:currentColor}',
      '.ra-tag{display:inline-flex;align-items:center;height:18px;padding:0 6px;border:.5px solid var(--dsw-alias-border-l3);border-radius:999px;color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:1;white-space:nowrap}',
      '.ra-compat-status{display:inline-flex;align-items:center;flex:none;font-size:11px;line-height:16px;font-weight:500;white-space:nowrap}',
      '.ra-compat-status[data-status=compatible]{color:var(--dsw-alias-state-success-primary)}',
      '.ra-compat-status[data-status=incompatible]{color:var(--dsw-alias-state-error-primary)}',
      '.ra-compat-status[data-status=unverified]{color:var(--dsw-alias-label-tertiary)}',
      '.ra-update-list{display:flex;flex-direction:column;gap:4px;margin:8px 0 0;padding:0;list-style:none}',
      '.ra-update-row{display:flex;align-items:center;gap:12px;min-width:0;padding:9px 8px;border-radius:var(--dsw-radius-md)}',
      '.ra-update-row:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.ra-update-main{display:flex;flex:1;flex-direction:column;gap:2px;min-width:0}',
      '.ra-update-title{display:flex;align-items:center;gap:8px;min-width:0;font-size:13px;font-weight:600}',
      '.ra-update-version{font:500 11px/16px ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--dsw-alias-label-tertiary)}',
      '.ra-pagination{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;padding-top:4px}',
      '.ra-pages{display:flex;align-items:center;gap:4px;min-width:0}',
      '.ra-page-button{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 7px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}',
      '.ra-page-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.ra-page-button[data-active=true]{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-weight:600}',
      '.ra-page-button:disabled{opacity:.45;cursor:default}',
      '.ra-plugin-link{display:inline-flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-label-tertiary);text-decoration:none}',
      '.ra-plugin-link:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-link)}',
      '.ra-plugin-actions{display:flex;align-items:center;gap:6px;flex:none}',
      '.ra-install-error{flex:1 0 calc(100% - 54px);max-width:calc(100% - 54px);margin:-8px 0 0 54px;color:var(--dsw-alias-state-error-primary);font-size:11px;line-height:16px;white-space:normal}',

      '@media(max-width:900px){.ra-source-grid{grid-template-columns:1fr}.ra-add-form{grid-template-columns:1fr 160px}.ra-add-form .ra-url-field{grid-column:1/-1}.ra-form-actions{grid-column:1/-1;justify-content:flex-end}.ra-filter-row{flex-wrap:wrap}}',
      '@media(max-width:560px){.ra-tabs{width:100%}.ra-tab{padding:0 8px}.ra-section-head{align-items:stretch;flex-direction:column}.ra-actions{justify-content:flex-end}.ra-add-form{grid-template-columns:1fr}.ra-add-form .ra-url-field,.ra-form-actions{grid-column:1}}',
    ].join('\n')

    function rpc(endpoint, payload, signal) {
      if (!connection?.rpc?.call) return Promise.reject(new Error('Host connection is unavailable'))
      return connection.rpc.call(CHANNEL, RPC_PREFIX + '/' + endpoint, payload, signal).then(result => {
        if (!result?.ok) throw new Error(result?.error?.message || 'Host request failed')
        return result.value
      })
    }

    function slug(value) {
      const input = String(value ?? '').trim()
      const ascii = input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
      if (ascii) return ascii
      let hash = 2166136261
      for (const char of input) {
        hash ^= char.codePointAt(0)
        hash = Math.imul(hash, 16777619)
      }
      return input ? 'source-' + (hash >>> 0).toString(36) : ''
    }

    function endpointFor(source) {
      if (source.url) return source.url
      if (source.type === 'npm') return 'https://registry.npmjs.org'
      if (source.type === 'github') return 'https://api.github.com'
      return source.id
    }

    function sourceInitial(source) {
      if (source.type === 'npm') return 'N'
      if (source.type === 'github') return 'G'
      if (source.type === 'corporate') return 'C'
      return '{}'
    }

    function format(t, key, values = {}) {
      let value = t(key)
      for (const [name, replacement] of Object.entries(values)) {
        value = value.replace('{' + name + '}', String(replacement))
      }
      return value
    }

    function SvgIcon({ size = 16, children, className, strokeWidth = 1 }) {
      return h('svg', {
        width: size,
        height: size,
        className,
        viewBox: '0 0 16 16',
        fill: 'none',
        xmlns: 'http://www.w3.org/2000/svg',
        'aria-hidden': true,
        strokeWidth,
      }, ...children)
    }

    const SOURCE_MARK_PATHS = {
      npm: 'M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z',
      github: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
    }

    function SourceMark({ type, size = 16 }) {
      const path = SOURCE_MARK_PATHS[type]
      if (path) {
        return h('svg', {
          width: size,
          height: size,
          className: 'ra-source-mark',
          viewBox: '-2 -2 28 28',
          fill: 'none',
          xmlns: 'http://www.w3.org/2000/svg',
          'aria-hidden': true,
        }, h('path', { d: path, fill: 'currentColor' }))
      }
      return type === 'corporate' ? h(IconPlugin, { size }) : h(IconArchive, { size })
    }

    function IconClock({ size = 16 }) {
      return h(SvgIcon, { size, children: [
        h('path', { d: 'M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z', stroke: 'currentColor' }),
        h('path', { d: 'M8 4.31V8.46L11 10.08', stroke: 'currentColor' }),
      ] })
    }

    function IconDatabase({ size = 16 }) {
      return h(SvgIcon, { size, children: [
        h('ellipse', { cx: '8', cy: '3.8', rx: '6', ry: '2.7', stroke: 'currentColor' }),
        h('path', { d: 'M2 3.8V11.8C2 13.3 4.7 14.9 8 14.9C11.3 14.9 14 13.3 14 11.8V3.8', stroke: 'currentColor' }),
        h('path', { d: 'M2 7.8C2 9.3 4.7 10.8 8 10.8C11.3 10.8 14 9.3 14 7.8', stroke: 'currentColor' }),
      ] })
    }

    function IconTag({ size = 16 }) {
      return h(SvgIcon, { size, children: [
        h('path', { d: 'M2 3.5V7.1L8.9 14L14 8.9L7.1 2H3.5C2.7 2 2 2.7 2 3.5Z', stroke: 'currentColor' }),
        h('circle', { cx: '5.1', cy: '5.1', r: '1', fill: 'currentColor' }),
      ] })
    }

    function IconList({ size = 16 }) {
      return h(SvgIcon, { size, children: [
        h('path', { d: 'M5 4H14M5 8H14M5 12H14', stroke: 'currentColor' }),
        h('circle', { cx: '2.2', cy: '4', r: '.7', fill: 'currentColor' }),
        h('circle', { cx: '2.2', cy: '8', r: '.7', fill: 'currentColor' }),
        h('circle', { cx: '2.2', cy: '12', r: '.7', fill: 'currentColor' }),
      ] })
    }

    function IconSearch({ size = 16 }) {
      return h(SvgIcon, { size, children: [
        h('circle', { cx: '7', cy: '7', r: '4.5', stroke: 'currentColor' }),
        h('path', { d: 'M10.5 10.5L14 14', stroke: 'currentColor' }),
      ] })
    }

    function IconDownload({ size = 16 }) {
      return h(SvgIcon, { size, children: [
        h('path', { d: 'M8 1.95317V10.0469', stroke: 'currentColor' }),
        h('path', { d: 'M4.25 6.29688L8 10.0469L11.75 6.29688', stroke: 'currentColor' }),
        h('path', { d: 'M1.5 10.0469V13.158C1.5 13.3937 1.60536 13.6198 1.79289 13.7865C1.98043 13.9532 2.23478 14.0469 2.5 14.0469H13.5C13.7652 14.0469 14.0196 13.9532 14.2071 13.7865C14.3946 13.6198 14.5 13.3937 14.5 13.158V10.0469', stroke: 'currentColor' }),
      ] })
    }

    function IconRightUp({ size = 16 }) {
      return h(SvgIcon, { size, children: [
        h('path', { d: 'M11.7256 2.77441C12.5538 2.77469 13.2256 3.44616 13.2256 4.27441V10.1416H12.2256V4.27441C12.2256 3.99844 12.0015 3.77469 11.7256 3.77441H5.7207V2.77441H11.7256Z', fill: 'currentColor' }),
        h('path', { d: 'M2.77441 13.2255L12.3756 3.62427', stroke: 'currentColor' }),
      ] })
    }

    function compactNumber(value) {
      if (!Number.isFinite(value)) return ''
      if (value < 1000) return String(value)
      if (value < 1_000_000) return (value / 1000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, '') + 'k'
      return (value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, '') + 'm'
    }

    function parseSemver(value) {
      const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/u.exec(String(value ?? '').trim())
      if (!match) return undefined
      return { core: [Number(match[1]), Number(match[2]), Number(match[3])], prerelease: match[4] ? match[4].split('.') : [] }
    }

    function compareSemver(left, right) {
      const a = parseSemver(left)
      const b = parseSemver(right)
      if (!a || !b) return 0
      for (let index = 0; index < 3; index += 1) {
        if (a.core[index] !== b.core[index]) return a.core[index] > b.core[index] ? 1 : -1
      }
      if (!a.prerelease.length && !b.prerelease.length) return 0
      if (!a.prerelease.length) return 1
      if (!b.prerelease.length) return -1
      const length = Math.max(a.prerelease.length, b.prerelease.length)
      for (let index = 0; index < length; index += 1) {
        const leftPart = a.prerelease[index]
        const rightPart = b.prerelease[index]
        if (leftPart === undefined) return -1
        if (rightPart === undefined) return 1
        if (leftPart === rightPart) continue
        const leftNumeric = /^\d+$/u.test(leftPart)
        const rightNumeric = /^\d+$/u.test(rightPart)
        if (leftNumeric && rightNumeric) return Number(leftPart) > Number(rightPart) ? 1 : -1
        if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1
        return leftPart > rightPart ? 1 : -1
      }
      return 0
    }

    function ageShort(value) {
      const stamp = Date.parse(value ?? '')
      if (!Number.isFinite(stamp)) return ''
      const days = Math.max(0, Math.floor((Date.now() - stamp) / 86_400_000))
      if (days === 0) return 'today'
      if (days < 30) return days + 'd'
      if (days < 365) return Math.floor(days / 30) + 'mo'
      return Math.floor(days / 365) + 'y'
    }

    function browsePluginKey(plugin) {
      return plugin?.key ?? plugin?.installSpec ?? plugin?.name ?? ''
    }

    function sortMetricValue(plugin, key, baseOrder) {
      if (key === 'relevance') {
        const index = baseOrder.get(browsePluginKey(plugin))
        return Number.isFinite(index) ? -index : undefined
      }
      if (key === 'stars') return Number.isFinite(plugin?.stars) ? plugin.stars : undefined
      if (key === 'downloads') return Number.isFinite(plugin?.downloads30d) ? plugin.downloads30d : undefined
      if (key === 'freshness') {
        const value = Date.parse(plugin?.releasedAt ?? plugin?.repositoryUpdatedAt ?? plugin?.updatedAt ?? '')
        return Number.isFinite(value) ? value : undefined
      }
      if (key === 'name') return String(plugin?.name ?? '').toLocaleLowerCase()
      return undefined
    }

    function metricPercentiles(plugins, criterion, baseOrder) {
      const rows = plugins.map((plugin, index) => ({
        plugin,
        index,
        value: sortMetricValue(plugin, criterion.key, baseOrder),
      })).filter(row => row.value !== undefined)

      rows.sort((left, right) => {
        if (typeof left.value === 'string' || typeof right.value === 'string') {
          return String(left.value).localeCompare(String(right.value)) || left.index - right.index
        }
        return left.value - right.value || left.index - right.index
      })

      const scores = new Map()
      const denominator = Math.max(1, rows.length - 1)
      let cursor = 0
      while (cursor < rows.length) {
        let end = cursor + 1
        while (end < rows.length && rows[end].value === rows[cursor].value) end += 1
        const percentile = ((cursor + end - 1) / 2) / denominator
        const preferred = criterion.direction === 'asc' ? 1 - percentile : percentile
        for (let index = cursor; index < end; index += 1) scores.set(rows[index].plugin, preferred)
        cursor = end
      }
      return scores
    }

    function compositeSortPlugins(plugins, sorts, baseOrder) {
      if (!Array.isArray(plugins) || plugins.length < 2 || !Array.isArray(sorts) || sorts.length === 0) return plugins
      const metrics = sorts.map(criterion => metricPercentiles(plugins, criterion, baseOrder))
      return [...plugins].sort((left, right) => {
        let leftScore = 0
        let rightScore = 0
        for (const scores of metrics) {
          // Missing evidence is deliberately worse than the lowest measured value.
          leftScore += scores.has(left) ? scores.get(left) : -1
          rightScore += scores.has(right) ? scores.get(right) : -1
        }
        leftScore /= metrics.length
        rightScore /= metrics.length
        if (rightScore !== leftScore) return rightScore - leftScore
        const leftBase = baseOrder.get(browsePluginKey(left)) ?? Number.MAX_SAFE_INTEGER
        const rightBase = baseOrder.get(browsePluginKey(right)) ?? Number.MAX_SAFE_INTEGER
        return leftBase - rightBase || String(left.name ?? '').localeCompare(String(right.name ?? ''))
      })
    }

    function IconRefresh({ size = 16, className }) {
      return h(SvgIcon, { size, className, children: [
        h('path', { d: 'M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5C9.9001 1.5 11.7001 2.3 13.0001 3.6L14.5001 5.1', stroke: 'currentColor' }),
        h('path', { d: 'M14.4999 1.5V5.1H10.8999', stroke: 'currentColor' }),
      ] })
    }

    function IconUpdate({ size = 16 }) {
      return h(SvgIcon, { size, children: [
        h('path', { d: 'M13.5 5.5C12.6 3.2 10.5 1.75 8 1.75C5.9 1.75 4.05 2.75 2.9 4.3L1.75 5.75', stroke: 'currentColor' }),
        h('path', { d: 'M1.75 2.75V5.75H4.75', stroke: 'currentColor' }),
        h('path', { d: 'M2.5 10.5C3.4 12.8 5.5 14.25 8 14.25C10.1 14.25 11.95 13.25 13.1 11.7L14.25 10.25', stroke: 'currentColor' }),
        h('path', { d: 'M14.25 13.25V10.25H11.25', stroke: 'currentColor' }),
      ] })
    }

    function IconPlus({ size = 16 }) {
      return h(SvgIcon, { size, children: [
        h('path', { d: 'M8 2V14', stroke: 'currentColor' }),
        h('path', { d: 'M2 8H14', stroke: 'currentColor' }),
      ] })
    }

    function IconClose({ size = 16 }) {
      return h(SvgIcon, { size, children: [
        h('path', { d: 'M2.5 2.5L13.5 13.5', stroke: 'currentColor' }),
        h('path', { d: 'M13.5 2.5L2.5 13.5', stroke: 'currentColor' }),
      ] })
    }

    function IconTrash({ size = 16 }) {
      return h(SvgIcon, { size, children: [
        h('path', { d: 'M1.28149 3.88831H14.7187', stroke: 'currentColor' }),
        h('path', { d: 'M5.41602 3.88833V2.47962C5.41602 2.29282 5.52492 2.11366 5.71876 1.98157C5.9126 1.84948 6.17551 1.77527 6.44964 1.77527H9.55053C9.82466 1.77527 10.0876 1.84948 10.2814 1.98157C10.4753 2.11366 10.5842 2.29282 10.5842 2.47962V3.88833', stroke: 'currentColor' }),
        h('path', { d: 'M2.57349 3.88831L3.19366 13.2943C3.21937 13.5502 3.33952 13.7872 3.53065 13.9593C3.72178 14.1313 3.97016 14.2259 4.22729 14.2246H11.7728C12.0299 14.2259 12.2783 14.1313 12.4694 13.9593C12.6605 13.7872 12.7807 13.5502 12.8064 13.2943L13.4266 3.88831', stroke: 'currentColor' }),
        h('path', { d: 'M6.44946 6.98926V11.1238', stroke: 'currentColor' }),
        h('path', { d: 'M9.55054 6.98926V11.1238', stroke: 'currentColor' }),
      ] })
    }

    function IconCopy({ size = 16 }) {
      return h(SvgIcon, { size, children: [
        h('rect', { x: '1.52075', y: '4.07373', width: '10.3932', height: '10.3932', rx: '2', stroke: 'currentColor' }),
        h('path', { d: 'M11.9792 1.53296C13.36 1.53296 14.4792 2.65225 14.4792 4.03296V9.42847C14.4792 10.3756 13.9521 11.1987 13.1755 11.6228V10.3298C13.3652 10.0787 13.4792 9.7674 13.4792 9.42847V4.03296C13.4792 3.20453 12.8077 2.53296 11.9792 2.53296H6.58374C6.27966 2.53301 5.99684 2.6235 5.7605 2.77905H4.42358C4.85652 2.03463 5.66056 1.53304 6.58374 1.53296H11.9792Z', fill: 'currentColor' }),
      ] })
    }

    function IconCheck({ size = 16 }) {
      return h(SvgIcon, { size, children: [
        h('path', { d: 'M2.25 8.5L5.49732 11.7473C5.90519 12.1552 6.57263 12.1344 6.95426 11.7018L13.75 4', stroke: 'currentColor' }),
      ] })
    }

    function IconShield({ size = 14 }) {
      return h(SvgIcon, { size, children: [
        h('path', {
          d: 'M6.80132 2.14853C7.70663 1.80917 8.70422 1.80919 9.60952 2.14859L14.1296 3.84317V7.11961C14.1296 11.6089 10.7615 13.5975 8.20543 14.5779C5.64931 13.5975 2.28052 11.6089 2.28052 7.11961V3.84317L6.80132 2.14853Z',
          stroke: 'currentColor',
          strokeLinejoin: 'round',
        }),
      ] })
    }

    function IconArchive({ size = 14 }) {
      return h(SvgIcon, { size, children: [
        h('path', { d: 'M13.5 2.5H2.5C1.94772 2.5 1.5 2.94772 1.5 3.5V4.5C1.5 5.05228 1.94772 5.5 2.5 5.5H13.5C14.0523 5.5 14.5 5.05228 14.5 4.5V3.5C14.5 2.94772 14.0523 2.5 13.5 2.5Z', stroke: 'currentColor' }),
        h('path', { d: 'M2.5 5.5V13.5C2.5 13.7652 2.60536 14.0196 2.79289 14.2071C2.98043 14.3946 3.23478 14.5 3.5 14.5H12.5C12.7652 14.5 13.0196 14.3946 13.2071 14.2071C13.3946 14.0196 13.5 13.7652 13.5 13.5V5.5', stroke: 'currentColor' }),
        h('path', { d: 'M6.5 9.5H9.5', stroke: 'currentColor' }),
      ] })
    }

    function IconPlugin({ size = 16 }) {
      return h(SvgIcon, { size, children: [
        h('path', { d: 'M3.16143 6.59068L1.75205 8.00006L3.10619 9.35419L2.39908 10.0613L0.832948 8.49517C0.559581 8.2218 0.559582 7.77831 0.832948 7.50494L2.45432 5.88357L3.16143 6.59068ZM8.49511 15.1671C8.22176 15.4405 7.77826 15.4404 7.50489 15.1671L5.93461 13.5968L6.64172 12.8897L8 14.248L9.40938 12.8386L10.1165 13.5457L8.49511 15.1671ZM15.1671 7.50494C15.4403 7.7782 15.4401 8.22179 15.1671 8.49517L13.652 10.0102L12.9449 9.30309L14.248 8.00006L12.8897 6.64178L13.5968 5.93467L15.1671 7.50494ZM9.35414 3.10624L8 1.7521L6.69696 3.05514L5.98986 2.34803L7.50489 0.833003C7.77828 0.559981 8.22186 0.559752 8.49511 0.833003L10.0612 2.39913L9.35414 3.10624Z', fill: 'currentColor' }),
        h('circle', { cx: '8', cy: '8', r: '1.76221', stroke: 'currentColor' }),
      ] })
    }

    function IconButton({ label, icon, disabled = false, danger = false, state, className = '', onClick }) {
      return h('button', {
        type: 'button',
        className: ['ra-icon-button', className].filter(Boolean).join(' '),
        title: label,
        'aria-label': label,
        'data-danger': danger || undefined,
        'data-state': state || undefined,
        disabled,
        onClick,
      }, icon)
    }

    async function copyText(value) {
      if (!navigator.clipboard?.writeText) return false
      try {
        await navigator.clipboard.writeText(value)
        return true
      } catch {
        return false
      }
    }

    async function readInstalledBundles() {
      if (!remote?.pluginManager?.listBundles) throw new Error('Native Plugin Manager is unavailable')
      const result = await remote.pluginManager.listBundles()
      if (!result?.ok) throw new Error(result?.error?.message || 'Could not read installed plugins')
      return Array.isArray(result.value) ? result.value : []
    }

    async function installBrowsePlugin(plugin, onProgress) {
      const spec = String(plugin?.installSpec ?? '').trim()
      if (!spec) throw new Error('Plugin has no install spec')
      if (!remote?.pluginManager?.inspect || !remote?.pluginManager?.installBundle) {
        throw new Error('Native Plugin Manager is unavailable')
      }

      onProgress?.({ phase: 'checking' })
      const inspected = await remote.pluginManager.inspect(spec, { registry: null })
      if (!inspected?.ok) throw new Error(inspected?.error?.message || 'Package inspection failed')
      if (inspected.value?.status === 'refused') {
        const error = new Error(inspected.value.reason || inspected.value.problem || 'Package was refused')
        error.problem = inspected.value.problem
        throw error
      }

      const requestId = globalThis.crypto?.randomUUID?.()
      if (!requestId) throw new Error('Browser cannot create an install request id')
      const registry = inspected.value.registry ?? null
      let dispose
      if (typeof remote?.$on === 'function') {
        dispose = remote.$on('plugin-manager/install-state', progress => {
          if (progress?.requestId !== requestId) return
          onProgress?.({ phase: progress.phase, requestId, attempt: progress.attempt })
        })
      }

      try {
        onProgress?.({ phase: 'starting', requestId })
        const answer = await remote.pluginManager.installBundle(spec, { enabled: true, registry, requestId })
        if (!answer?.ok) throw new Error(answer?.error?.message || 'Plugin installation request failed')
        const result = answer.value
        if (result?.application === 'failed') {
          const error = new Error(result?.error?.diagnostic || result?.packageResult?.output || result?.error?.message || 'Plugin installation failed')
          error.installResult = result
          throw error
        }
        if (result?.application === 'cancelled') {
          const error = new Error('Plugin installation was cancelled')
          error.cancelled = true
          throw error
        }
        onProgress?.({ phase: 'done', requestId, bundle: result?.bundle, application: result?.application })
        return result
      } finally {
        if (typeof dispose === 'function') dispose()
      }
    }

    async function updateInstalledPlugin(bundle, availableVersion, onProgress) {
      const name = String(bundle?.name ?? '').trim()
      const version = String(availableVersion ?? '').trim()
      if (!name || !version) throw new Error('Update target is unavailable')
      if (!remote?.pluginManager?.installBundle) throw new Error('Native Plugin Manager is unavailable')
      const requestId = globalThis.crypto?.randomUUID?.()
      if (!requestId) throw new Error('Browser cannot create an update request id')

      let dispose
      if (typeof remote?.$on === 'function') {
        dispose = remote.$on('plugin-manager/install-state', progress => {
          if (progress?.requestId !== requestId) return
          onProgress?.({ phase: progress.phase, requestId, attempt: progress.attempt })
        })
      }
      try {
        onProgress?.({ phase: 'starting', requestId })
        const answer = await remote.pluginManager.installBundle(name + '@' + version, {
          enabled: bundle.enabled !== false,
          registry: null,
          requestId,
        })
        if (!answer?.ok) throw new Error(answer?.error?.message || 'Plugin update request failed')
        const result = answer.value
        if (result?.application === 'failed') {
          const error = new Error(result?.error?.diagnostic || result?.packageResult?.output || result?.error?.message || 'Plugin update failed')
          error.installResult = result
          throw error
        }
        if (result?.application === 'cancelled') throw new Error('Plugin update was cancelled')
        onProgress?.({ phase: 'done', requestId })
        return result
      } finally {
        if (typeof dispose === 'function') dispose()
      }
    }

    function PluginArtwork({ src }) {
      const [failed, setFailed] = React.useState(false)
      React.useEffect(() => { setFailed(false) }, [src])
      if (!src || failed) return h(IconPlugin, { size: 16 })
      return h('img', {
        className: 'ra-plugin-image',
        src,
        alt: '',
        width: 30,
        height: 30,
        onError: () => setFailed(true),
      })
    }

    function Empty({ title, body }) {
      return h('div', { className: 'ra-empty' },
        h('strong', null, title),
        body ? h('span', null, body) : null,
      )
    }

    function Toggle({ checked, disabled, label, onChange }) {
      return h('button', {
        type: 'button',
        role: 'switch',
        className: 'ra-switch',
        'aria-checked': checked,
        'aria-label': label,
        title: label,
        disabled,
        onClick: onChange,
      }, h('span', { className: 'ra-switch-thumb' }))
    }

    function AddSource({ t, sources, busy, writable, onSave }) {
      const [open, setOpen] = React.useState(false)
      const [name, setName] = React.useState('')
      const [type, setType] = React.useState('custom-json')
      const [url, setUrl] = React.useState('')
      const [error, setError] = React.useState('')

      const reset = () => {
        setName('')
        setType('custom-json')
        setUrl('')
        setError('')
        setOpen(false)
      }

      const submit = async event => {
        event.preventDefault()
        const id = slug(name)
        const needsUrl = type === 'custom-json' || type === 'corporate'
        if (!id) return setError(t('sourceRequired'))
        if (needsUrl && !url.trim()) return setError(t('sourceUrlRequired'))
        if (sources.some(source => source.id === id)) return setError(t('sourceDuplicate'))
        setError('')
        try {
          await onSave([
            ...sources,
            { id, name: name.trim(), type, ...(url.trim() ? { url: url.trim() } : {}), enabled: true },
          ])
          reset()
        } catch (failure) {
          setError(String(failure?.message ?? failure))
        }
      }

      return h('section', { className: 'ra-panel' },
        h('div', { className: 'ra-add-head' },
          h('div', null, h('div', { className: 'ra-heading' }, t('sourceAddTitle'))),
          h(IconButton, {
            label: open ? t('sourceCancel') : t('sourceAdd'),
            disabled: !writable || busy,
            onClick: () => setOpen(value => !value),
            icon: open ? h(IconClose, { size: 14 }) : h(IconPlus, { size: 14 }),
          }),
        ),
        open ? h('form', { className: 'ra-add-form', onSubmit: submit },
          h('div', { className: 'ra-field' },
            h('label', { htmlFor: 'ra-source-name' }, t('sourceName')),
            h('input', {
              id: 'ra-source-name',
              className: 'ra-input',
              value: name,
              disabled: busy,
              onChange: event => {
                setName(event.target.value)
                setError('')
              },
            }),
          ),
          h('div', { className: 'ra-field' },
            h('label', { htmlFor: 'ra-source-type' }, t('sourceType')),
            h('select', {
              id: 'ra-source-type',
              className: 'ra-select',
              value: type,
              disabled: busy,
              onChange: event => {
                setType(event.target.value)
                setError('')
              },
            }, ...SOURCE_TYPES.map(item => h('option', { key: item, value: item }, item))),
          ),
          h('div', { className: 'ra-field ra-url-field' },
            h('label', { htmlFor: 'ra-source-url' }, t('sourceUrl')),
            h('input', {
              id: 'ra-source-url',
              className: 'ra-input',
              type: 'url',
              value: url,
              placeholder: t('sourceUrlHint'),
              disabled: busy,
              onChange: event => {
                setUrl(event.target.value)
                setError('')
              },
            }),
          ),
          h('div', { className: 'ra-form-actions' },
            h('button', {
              type: 'submit',
              className: 'ra-icon-button',
              title: t('sourceSave'),
              'aria-label': t('sourceSave'),
              disabled: busy,
            }, h(IconPlus, { size: 15 })),
          ),
          error ? h('p', { className: 'ra-error', role: 'alert' }, error) : null,
        ) : null,
      )
    }

    function SourceCard({ source, health, countState, t, busy, writable, onToggle, onRemove }) {
      const [copied, setCopied] = React.useState(false)
      const disabled = source.enabled === false
      const state = disabled ? 'off' : health?.ok === true ? 'ok' : health?.ok === false ? 'bad' : 'wait'
      const statusText = disabled
        ? t('sourceDisabled')
        : state === 'ok'
          ? t('sourceOnline')
          : state === 'bad'
            ? t('sourceOffline')
            : t('sourceChecking')
      const count = Number.isFinite(countState?.count) ? countState.count : undefined
      const endpoint = endpointFor(source)
      const error = health?.error || countState?.error

      const copy = async () => {
        const ok = await copyText(endpoint)
        if (!ok) return
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }

      return h('article', { className: 'ra-source-card' },
        h('div', { className: 'ra-source-top' },
          h('div', { className: 'ra-source-main' },
            h('div', { className: 'ra-source-logo', 'aria-hidden': true }, h(SourceMark, { type: source.type, size: 18 })),
            h('div', { className: 'ra-source-copy' },
              h('div', { className: 'ra-source-name', title: source.name }, source.name),
              h('div', { className: 'ra-source-meta' },
                h('span', { className: 'ra-status' },
                  h('span', { className: 'ra-dot', 'data-state': state }),
                  h('span', null, statusText),
                ),
                countState?.loading
                  ? h('span', { className: 'ra-meta-icon', title: t('sourceCounting') },
                    h(IconRefresh, { size: 12, className: 'ra-spin' }))
                  : count === undefined
                    ? null
                    : h('span', { className: 'ra-meta-icon' },
                      h(IconArchive, { size: 12 }),
                      h('span', null, String(count) + (countState?.truncated ? '+' : '')),
                    ),
              ),
            ),
          ),
          h('div', { className: 'ra-source-controls' },
            h(Toggle, {
              checked: !disabled,
              disabled: !writable || busy,
              label: !disabled ? t('sourceEnabled') : t('sourceDisabled'),
              onChange: () => onToggle(source.id),
            }),
            h(IconButton, {
              label: t('sourceRemove'),
              danger: true,
              disabled: !writable || busy,
              onClick: () => onRemove(source.id),
              icon: h(IconTrash, { size: 15 }),
            }),
          ),
        ),
        h('div', { className: 'ra-source-url' },
          h('code', { title: endpoint }, endpoint),
          h(IconButton, {
            label: copied ? t('copied') : t('sourceCopy'),
            onClick: copy,
            icon: copied ? h(IconCheck, { size: 14 }) : h(IconCopy, { size: 14 }),
          }),
        ),
        error ? h('div', { className: 'ra-source-error', title: error }, error) : null,
      )
    }

    function SourcesView({ t, form }) {
      const hostSources = Array.isArray(form?.state?.value?.sources) ? form.state.value.sources : []
      const hostKey = JSON.stringify(hostSources)
      const [sources, setSources] = React.useState(hostSources)
      const [busy, setBusy] = React.useState(false)
      const [mutationError, setMutationError] = React.useState('')
      const [revision, setRevision] = React.useState(0)
      const [healthState, setHealthState] = React.useState({ loading: true, rows: [], error: '' })
      const [countState, setCountState] = React.useState({ loading: true, rows: [], error: '' })

      React.useEffect(() => {
        setSources(hostSources)
      }, [hostKey])

      const sourceKey = JSON.stringify(sources)
      React.useEffect(() => {
        const controller = new AbortController()
        setHealthState({ loading: true, rows: [], error: '' })
        setCountState({ loading: true, rows: [], error: '' })

        rpc('health', {}, controller.signal).then(value => {
          setHealthState({ loading: false, rows: value?.sources ?? [], error: '' })
        }, error => {
          if (!controller.signal.aborted) setHealthState({ loading: false, rows: [], error: String(error?.message ?? error) })
        })

        rpc('counts', {}, controller.signal).then(value => {
          setCountState({ loading: false, rows: value?.sources ?? [], error: '' })
        }, error => {
          if (!controller.signal.aborted) setCountState({ loading: false, rows: [], error: String(error?.message ?? error) })
        })

        return () => controller.abort()
      }, [sourceKey, revision])

      if (!form || form.state.status === 'loading') {
        return h(Empty, { title: t('sourceChecking') })
      }
      if (form.state.status !== 'ready') {
        return h(Empty, { title: t('sourceUnavailable') })
      }

      const writable = form.state.writable === true
      const healthMap = new Map(healthState.rows.map(row => [row?.source?.id, row?.health]))
      const countMap = new Map(countState.rows.map(row => [row?.source?.id, row]))
      const saveSources = async next => {
        setBusy(true)
        setMutationError('')
        try {
          const accepted = await form.mutate(
            [{ op: 'set', path: ['sources'], value: next }],
            form.state.revision,
          )
          if (!accepted) throw new Error(t('sourceSaveFailed'))
          setSources(next)
          setRevision(value => value + 1)
        } finally {
          setBusy(false)
        }
      }

      const mutate = async next => {
        try {
          await saveSources(next)
        } catch (error) {
          setMutationError(String(error?.message ?? error))
          throw error
        }
      }

      return h('section', { className: 'ra-section', 'aria-labelledby': 'ra-sources-title' },
        h('div', { className: 'ra-section-head' },
          h('div', null,
            h('h3', { id: 'ra-sources-title', className: 'ra-heading' }, t('sourcesTitle')),
            h('p', { className: 'ra-lead' }, t('sourcesLead')),
          ),
          h('div', { className: 'ra-actions' },
            h(IconButton, {
              label: t('sourceRefresh'),
              disabled: healthState.loading || countState.loading,
              onClick: () => setRevision(value => value + 1),
              icon: h(IconRefresh, { size: 16, className: healthState.loading || countState.loading ? 'ra-spin' : undefined }),
            }),
          ),
        ),
        h(AddSource, { t, sources, busy, writable, onSave: mutate }),
        !writable ? h('p', { className: 'ra-notice' }, t('sourceReadOnly')) : null,
        mutationError ? h('p', { className: 'ra-notice', role: 'alert' }, mutationError) : null,
        healthState.error ? h('p', { className: 'ra-notice', role: 'alert' }, healthState.error) : null,
        countState.error ? h('p', { className: 'ra-notice', role: 'alert' }, countState.error) : null,
        sources.length === 0
          ? h(Empty, { title: t('sourceEmpty') })
          : h('div', { className: 'ra-source-grid' },
            ...sources.map(source => h(SourceCard, {
              key: source.id,
              source,
              health: healthMap.get(source.id),
              countState: countMap.get(source.id) ?? { loading: countState.loading },
              t,
              busy,
              writable,
              onToggle: id => {
                void mutate(sources.map(row => row.id === id ? { ...row, enabled: row.enabled === false } : row))
              },
              onRemove: id => {
                void mutate(sources.filter(row => row.id !== id))
              },
            })),
          ),
      )
    }

    function BrowseView({ t }) {
      const [query, setQuery] = React.useState('')
      const [revision, setRevision] = React.useState(0)
      const [sourceFilter, setSourceFilter] = React.useState('all')
      const [sorts, setSorts] = React.useState([])
      const [releaseFilter, setReleaseFilter] = React.useState('all')
      const [freshness, setFreshness] = React.useState('any')
      const [tagFilter, setTagFilter] = React.useState('all')
      const [compatibilityFilter, setCompatibilityFilter] = React.useState('all')
      const [page, setPage] = React.useState(1)
      const [pageSize, setPageSize] = React.useState(20)
      const [state, setState] = React.useState({ loading: true, data: null, error: '' })
      const [iconEvidence, setIconEvidence] = React.useState({})
      const [metadataEvidence, setMetadataEvidence] = React.useState({})
      const [downloadEvidence, setDownloadEvidence] = React.useState({})
      const [installedBundles, setInstalledBundles] = React.useState([])
      const [installStates, setInstallStates] = React.useState({})

      React.useEffect(() => {
        const controller = new AbortController()
        const timer = setTimeout(() => {
          setState(current => ({ ...current, loading: true, error: '' }))
          rpc('browse', { query, limit: 100 }, controller.signal).then(data => {
            setState({ loading: false, data, error: '' })
          }, error => {
            if (!controller.signal.aborted) {
              setState({ loading: false, data: null, error: String(error?.message ?? error) })
            }
          })
        }, 220)
        return () => {
          clearTimeout(timer)
          controller.abort()
        }
      }, [query, revision])

      React.useEffect(() => {
        let active = true
        const load = async () => {
          try {
            const bundles = await readInstalledBundles()
            if (active) setInstalledBundles(bundles)
          } catch {
            // Browse remains usable even when the management inventory cannot be read.
          }
        }
        void load()
        const dispose = typeof remote?.$on === 'function'
          ? remote.$on('plugin-manager/changed', () => { void load() })
          : undefined
        return () => {
          active = false
          if (typeof dispose === 'function') dispose()
        }
      }, [])

      const sortSignature = sorts.map(item => item.key + ':' + item.direction).join('|')
      React.useEffect(() => { setPage(1) }, [query, sourceFilter, sortSignature, releaseFilter, freshness, tagFilter, compatibilityFilter, pageSize])

      const plugins = state.data?.plugins ?? []
      const sourceRows = state.data?.sources ?? []
      const failedSources = sourceRows.filter(row => row?.ok === false)
      const availableSources = [...new Map(plugins.flatMap(plugin => plugin.sources ?? []).map(source => [source.type, source])).values()]
      const availableTags = [...new Set(plugins.flatMap(plugin => plugin.tags ?? []).filter(Boolean))].sort((a, b) => a.localeCompare(b))
      const baseOrder = new Map(plugins.map((plugin, index) => [plugin.key ?? plugin.installSpec ?? plugin.name, index]))
      const installedNames = new Set(installedBundles.filter(bundle => bundle?.installed || bundle?.optional).map(bundle => bundle?.name).filter(Boolean))
      const isInstalled = plugin => Boolean(plugin?.packageName && installedNames.has(plugin.packageName))
        || installStates[browsePluginKey(plugin)]?.phase === 'done'

      const runInstall = async plugin => {
        const pluginKey = browsePluginKey(plugin)
        const current = installStates[pluginKey]
        if (!pluginKey || current?.phase === 'checking' || current?.phase === 'starting'
          || current?.phase === 'installing' || current?.phase === 'applying' || current?.phase === 'done') return

        setInstallStates(states => ({ ...states, [pluginKey]: { phase: 'checking', error: '' } }))
        try {
          const result = await installBrowsePlugin(plugin, progress => {
            setInstallStates(states => ({
              ...states,
              [pluginKey]: { ...(states[pluginKey] ?? {}), ...progress, error: '' },
            }))
          })
          setInstallStates(states => ({
            ...states,
            [pluginKey]: { phase: 'done', bundle: result?.bundle, application: result?.application, error: '' },
          }))
          try {
            setInstalledBundles(await readInstalledBundles())
          } catch {}
        } catch (error) {
          const problem = error?.problem
          if (problem === 'already-installed') {
            setInstallStates(states => ({ ...states, [pluginKey]: { phase: 'done', error: '' } }))
            try { setInstalledBundles(await readInstalledBundles()) } catch {}
            return
          }
          const result = error?.installResult
          const message = Array.isArray(result?.pendingBuilds) && result.pendingBuilds.length
            ? t('installApproval') + ' ' + result.pendingBuilds.join(', ')
            : problem === 'not-a-bundle'
              ? t('installNotBundle')
              : String(error?.message ?? t('installFailed'))
          setInstallStates(states => ({ ...states, [pluginKey]: { phase: 'failed', error: message } }))
        }
      }

      const metadataSource = compatibilityFilter === 'all' ? [] : plugins
      const metadataItems = metadataSource.map(plugin => ({
        key: browsePluginKey(plugin),
        ...(plugin.packageName ? { packageName: plugin.packageName } : {}),
        ...(plugin.version ? { version: plugin.version } : {}),
        ...(plugin.repository ? { repository: plugin.repository } : {}),
      })).filter(item => item.packageName || item.repository)
      const metadataSignature = [
        compatibilityFilter,
        ...metadataItems.map(item => [item.key, item.packageName ?? '', item.version ?? '', item.repository ?? ''].join('|')),
      ].join(';')

      React.useEffect(() => {
        if (!metadataItems.length) return undefined
        const controller = new AbortController()
        const batches = []
        for (let index = 0; index < metadataItems.length; index += 24) batches.push(metadataItems.slice(index, index + 24))
        Promise.all(batches.map(items => rpc('metadata', { items }, controller.signal))).then(values => {
          if (controller.signal.aborted) return
          setMetadataEvidence(current => {
            const next = { ...current }
            for (const value of values) {
              for (const row of value?.plugins ?? []) if (row?.key) next[row.key] = row
            }
            return next
          })
        }, () => {
          if (controller.signal.aborted) return
          setMetadataEvidence(current => {
            const next = { ...current }
            for (const item of metadataItems) if (item?.key && next[item.key] === undefined) next[item.key] = { compatibility: 'unchecked' }
            return next
          })
        })
        return () => controller.abort()
      }, [metadataSignature])

      const compatibilityOf = plugin => {
        const status = metadataEvidence[browsePluginKey(plugin)]?.compatibility
        if (status === 'compatible') return 'compatible'
        if (status === 'unsupported') return 'incompatible'
        return 'unverified'
      }

      const compatibilityPending = compatibilityFilter !== 'all'
        && metadataItems.some(item => metadataEvidence[item.key] === undefined)

      const filtered = plugins.filter(plugin => {
        if (sourceFilter !== 'all' && !(plugin.sources ?? []).some(source => source.type === sourceFilter)) return false
        const prerelease = plugin.channel === 'prerelease' || String(plugin.version ?? '').includes('-')
        if (releaseFilter === 'stable' && prerelease) return false
        if (releaseFilter === 'prerelease' && !prerelease) return false
        if (tagFilter !== 'all' && !(plugin.tags ?? []).includes(tagFilter)) return false
        if (compatibilityFilter !== 'all' && compatibilityOf(plugin) !== compatibilityFilter) return false
        if (freshness !== 'any') {
          const stamp = Date.parse(plugin.updatedAt ?? '')
          if (!Number.isFinite(stamp)) return false
          const maxDays = Number(freshness)
          if ((Date.now() - stamp) / 86_400_000 > maxDays) return false
        }
        return true
      })

      const sorted = compositeSortPlugins(filtered, sorts, baseOrder)

      const cycleSort = key => {
        setSorts(current => {
          const index = current.findIndex(item => item.key === key)
          if (index < 0) return [...current, { key, direction: key === 'name' ? 'asc' : 'desc' }]
          if (current[index].direction === (key === 'name' ? 'asc' : 'desc')) {
            return current.map((item, at) => at === index
              ? { ...item, direction: key === 'name' ? 'desc' : 'asc' }
              : item)
          }
          return current.filter((_, at) => at !== index)
        })
      }

      const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
      const currentPage = Math.min(page, pageCount)
      const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
      const iconItems = visible
        .filter(plugin => (plugin.packageName && plugin.version) || plugin.repository)
        .map(plugin => ({
          key: plugin.key ?? plugin.installSpec ?? plugin.name,
          ...(plugin.packageName ? { packageName: plugin.packageName } : {}),
          ...(plugin.version ? { version: plugin.version } : {}),
          ...(plugin.repository ? { repository: plugin.repository } : {}),
        }))
      const iconSignature = iconItems.map(item => [item.key, item.packageName ?? '', item.version ?? '', item.repository ?? ''].join('|')).join(';')

      React.useEffect(() => {
        if (!iconItems.length) return undefined
        const controller = new AbortController()
        const batches = []
        for (let index = 0; index < iconItems.length; index += 6) batches.push(iconItems.slice(index, index + 6))
        Promise.all(batches.map(items => rpc('icons', { items }, controller.signal))).then(values => {
          if (controller.signal.aborted) return
          setIconEvidence(current => {
            const next = { ...current }
            for (const value of values) {
              for (const row of value?.icons ?? []) {
                if (row?.key && row?.icon) next[row.key] = row.icon
              }
            }
            return next
          })
        }, () => {})
        return () => controller.abort()
      }, [iconSignature])

      const visibleMetadataItems = compatibilityFilter === 'all'
        ? visible.map(plugin => ({
            key: browsePluginKey(plugin),
            ...(plugin.packageName ? { packageName: plugin.packageName } : {}),
            ...(plugin.version ? { version: plugin.version } : {}),
            ...(plugin.repository ? { repository: plugin.repository } : {}),
          })).filter(item => item.packageName || item.repository)
        : []
      const visibleMetadataSignature = visibleMetadataItems
        .map(item => [item.key, item.packageName ?? '', item.version ?? '', item.repository ?? ''].join('|'))
        .join(';')

      React.useEffect(() => {
        if (!visibleMetadataItems.length) return undefined
        const controller = new AbortController()
        rpc('metadata', { items: visibleMetadataItems }, controller.signal).then(value => {
          if (controller.signal.aborted) return
          setMetadataEvidence(current => {
            const next = { ...current }
            for (const row of value?.plugins ?? []) if (row?.key) next[row.key] = row
            return next
          })
        }, () => {})
        return () => controller.abort()
      }, [visibleMetadataSignature])

      const downloadItems = visible
        .filter(plugin => plugin.packageName)
        .map(plugin => ({
          key: browsePluginKey(plugin),
          packageName: plugin.packageName,
          ...(Number.isFinite(plugin.downloads30d) ? { downloads30d: plugin.downloads30d } : {}),
        }))
      const downloadSignature = [
        revision,
        ...downloadItems.map(item => [item.key, item.packageName, item.downloads30d ?? ''].join('|')),
      ].join(';')

      React.useEffect(() => {
        if (!downloadItems.length) return undefined
        const controller = new AbortController()
        setDownloadEvidence(current => {
          const next = { ...current }
          for (const item of downloadItems) next[item.key] = { ...(next[item.key] ?? {}), packageName: item.packageName, loading: true }
          return next
        })
        rpc('download-stats', { items: downloadItems }, controller.signal).then(value => {
          if (controller.signal.aborted) return
          setDownloadEvidence(current => {
            const next = { ...current }
            const returned = new Set()
            for (const row of value?.plugins ?? []) {
              if (!row?.key) continue
              returned.add(row.key)
              next[row.key] = {
                packageName: row.packageName,
                loading: false,
                complete: row.complete === true
                  && Number.isFinite(row.downloads30d)
                  && Number.isFinite(row.downloadsTotal),
                ...(Number.isFinite(row.downloads30d) ? { downloads30d: row.downloads30d } : {}),
                ...(Number.isFinite(row.downloadsTotal) ? { downloadsTotal: row.downloadsTotal } : {}),
              }
            }
            for (const item of downloadItems) {
              if (!returned.has(item.key)) next[item.key] = { packageName: item.packageName, loading: false, complete: false }
            }
            return next
          })
        }, () => {
          if (controller.signal.aborted) return
          setDownloadEvidence(current => {
            const next = { ...current }
            for (const item of downloadItems) next[item.key] = { packageName: item.packageName, loading: false, complete: false }
            return next
          })
        })
        return () => controller.abort()
      }, [downloadSignature])

      const resultLabel = state.loading
        ? t('browseLoading')
        : compatibilityPending
          ? t('compatibilityChecking')
          : query.trim() || compatibilityFilter !== 'all'
            ? format(t, 'browseResults', { count: sorted.length })
            : t('browsePopular')

      const compactFilter = (kind, label, icon, value, onChange, options, active = false) => h('label', {
        className: 'ra-compact-filter',
        'data-kind': kind,
        'data-active': active || undefined,
        title: label,
      },
        h('span', { className: 'ra-compact-filter-icon', 'aria-hidden': true }, icon),
        h('select', {
          value,
          'aria-label': label,
          onChange: event => onChange(event.target.value),
        }, ...options.map(option => h('option', { key: option.value, value: option.value }, option.label))),
      )

      const sortCriterion = (key, label, icon) => {
        const index = sorts.findIndex(item => item.key === key)
        const active = index >= 0
        const direction = active ? sorts[index].direction : undefined
        const stateLabel = active ? t(direction === 'asc' ? 'sortAsc' : 'sortDesc') : t('sortOff')
        const title = label + ' · ' + stateLabel + (active && sorts.length > 1 ? ' · ' + t('sortCombined') : '')
        return h('button', {
          key,
          type: 'button',
          className: 'ra-sort-criterion',
          'data-active': active || undefined,
          title,
          'aria-label': title,
          onClick: () => cycleSort(key),
        },
          h('span', { className: 'ra-sort-symbol' }, icon),
          active ? h('span', { className: 'ra-sort-direction', 'aria-hidden': true }, direction === 'asc' ? '↑' : '↓') : null,
        )
      }

      const pageButtons = []
      const from = Math.max(1, Math.min(currentPage - 2, pageCount - 4))
      const to = Math.min(pageCount, Math.max(currentPage + 2, 5))
      for (let value = from; value <= to; value += 1) {
        pageButtons.push(h('button', {
          key: value,
          type: 'button',
          className: 'ra-page-button',
          'data-active': value === currentPage || undefined,
          'aria-current': value === currentPage ? 'page' : undefined,
          onClick: () => setPage(value),
        }, String(value)))
      }

      return h('section', { className: 'ra-section', 'aria-labelledby': 'ra-browse-title' },
        h('div', { className: 'ra-section-head' },
          h('div', null,
            h('h3', { id: 'ra-browse-title', className: 'ra-heading' }, t('browseTitle')),
            h('p', { className: 'ra-lead' }, t('browseLead')),
          ),
          h('div', { className: 'ra-actions' },
            h(IconButton, {
              label: t('browseRefresh'),
              disabled: state.loading,
              onClick: () => setRevision(value => value + 1),
              icon: h(IconRefresh, { size: 16, className: state.loading ? 'ra-spin' : undefined }),
            }),
          ),
        ),
        h('input', {
          className: 'ra-search',
          type: 'search',
          value: query,
          placeholder: t('browsePlaceholder'),
          'aria-label': t('browsePlaceholder'),
          onChange: event => setQuery(event.target.value),
        }),
        h('div', { className: 'ra-filter-row' },
          compactFilter('source', t('filterSource'), h(IconDatabase, { size: 14 }), sourceFilter, setSourceFilter, [
            { value: 'all', label: t('filterAllSources') },
            ...availableSources.map(source => ({ value: source.type, label: source.name })),
          ], sourceFilter !== 'all'),
          compactFilter('release', t('filterRelease'), h(IconArchive, { size: 14 }), releaseFilter, setReleaseFilter, [
            { value: 'all', label: t('releaseAll') },
            { value: 'stable', label: t('releaseStable') },
            { value: 'prerelease', label: t('releasePrerelease') },
          ], releaseFilter !== 'all'),
          compactFilter('freshness', t('filterFreshness'), h(IconClock, { size: 14 }), freshness, setFreshness, [
            { value: 'any', label: t('freshnessAny') },
            { value: '30', label: '30d' },
            { value: '90', label: '90d' },
            { value: '365', label: '1y' },
          ], freshness !== 'any'),
          compactFilter('tag', t('filterTag'), h(IconTag, { size: 14 }), tagFilter, setTagFilter, [
            { value: 'all', label: t('filterAllTags') },
            ...availableTags.map(tag => ({ value: tag, label: tag })),
          ], tagFilter !== 'all'),
          compactFilter('compatibility', t('filterCompatibility'), h(IconShield, { size: 14 }), compatibilityFilter, setCompatibilityFilter, [
            { value: 'all', label: t('compatibilityAll') },
            { value: 'compatible', label: t('compatibilityCompatible') },
            { value: 'incompatible', label: t('compatibilityIncompatible') },
            { value: 'unverified', label: t('compatibilityUnverified') },
          ], compatibilityFilter !== 'all'),
          h('div', { className: 'ra-sort-row', role: 'group', 'aria-label': t('filterSort') },
            sortCriterion('relevance', t('sortRelevance'), h(IconSearch, { size: 13 })),
            sortCriterion('stars', t('sortStars'), h('span', { className: 'ra-star' }, '★')),
            sortCriterion('downloads', t('sortDownloads'), h(IconDownload, { size: 13 })),
            sortCriterion('freshness', t('sortFreshness'), h(IconClock, { size: 13 })),
            sortCriterion('name', t('sortName'), h('span', null, 'A')),
          ),
          compactFilter('page', t('pageSize'), h(IconList, { size: 14 }), String(pageSize), value => setPageSize(Number(value)), [
            { value: '20', label: '20' },
            { value: '50', label: '50' },
            { value: '100', label: '100' },
          ], pageSize !== 20),
        ),
        h('div', { className: 'ra-plugin-meta', role: 'status', 'aria-live': 'polite' }, resultLabel),
        state.error ? h('p', { className: 'ra-notice', role: 'alert' }, state.error) : null,
        failedSources.length ? h('p', { className: 'ra-notice' },
          t('browseSourceFailures') + ' ' + failedSources.map(row => row?.source?.name ?? row?.source?.id).filter(Boolean).join(', '),
        ) : null,
        !state.loading && !state.error && visible.length === 0
          ? compatibilityPending
            ? null
            : h(Empty, { title: t('browseNoResults'), body: t('browseNoResultsBody') })
          : h('ul', { className: 'ra-browse-list' },
            ...visible.map(plugin => {
              const pluginKey = plugin.key ?? plugin.installSpec ?? plugin.name
              const pluginMetadata = metadataEvidence[pluginKey] ?? {}
              const displayVersion = pluginMetadata.version ?? plugin.version
              const compatibilityStatus = compatibilityOf(plugin)
              const compatibilityLabel = compatibilityStatus === 'compatible'
                ? t('compatible')
                : compatibilityStatus === 'incompatible'
                  ? t('incompatible')
                  : t('notVerified')
              const compatibilityTitle = format(
                t,
                compatibilityStatus === 'incompatible' ? 'incompatibleTitle' : 'compatibilityTitle',
                { version: pluginMetadata.runtimeVersion ?? '?' },
              )
              const downloadStats = downloadEvidence[pluginKey]
              const downloads30d = downloadStats?.complete
                ? downloadStats.downloads30d
                : Number.isFinite(plugin.downloads30d) ? plugin.downloads30d : undefined
              const downloadsTotal = downloadStats?.complete ? downloadStats.downloadsTotal : undefined
              const downloadsLabel = plugin.packageName
                ? (Number.isFinite(downloads30d) ? compactNumber(downloads30d) : downloadStats?.loading ? '…' : '—') + ' / 30d'
                  + ' | ' + (Number.isFinite(downloadsTotal) ? compactNumber(downloadsTotal) : downloadStats?.loading ? '…' : '—') + ' / total'
                : ''
              const freshnessAt = plugin.releasedAt ?? plugin.repositoryUpdatedAt ?? plugin.updatedAt
              const freshnessAge = ageShort(freshnessAt)
              const freshnessLabel = freshnessAge
                ? plugin.releasedAt
                  ? format(t, 'released', { value: freshnessAge })
                  : format(t, 'repoUpdated', { value: freshnessAge })
                : ''
              const prerelease = plugin.channel === 'prerelease' || String(plugin.version ?? '').includes('-')
              return h('li', { key: pluginKey, className: 'ra-plugin-card' },
                h('span', { className: 'ra-plugin-icon', 'aria-hidden': true }, h(PluginArtwork, { src: iconEvidence[pluginKey] })),
                h('div', { className: 'ra-plugin-main' },
                  h('div', { className: 'ra-plugin-title-row' },
                    h('span', { className: 'ra-plugin-title', title: plugin.name }, plugin.name),
                  ),
                  plugin.description ? h('div', { className: 'ra-plugin-desc', title: plugin.description }, plugin.description) : null,
                  h('div', { className: 'ra-plugin-stats' },
                    ...(plugin.sources ?? []).map(source => h('span', { key: source.id, className: 'ra-plugin-meta-item', title: source.name },
                      h(SourceMark, { type: source.type, size: 12 }),
                      h('span', null, source.name),
                    )),
                    displayVersion ? h('span', { className: 'ra-plugin-version' }, 'v' + displayVersion) : null,
                    prerelease ? h('span', { className: 'ra-tag' }, t('prerelease')) : null,
                    h('span', { className: 'ra-compat-status', 'data-status': compatibilityStatus, title: compatibilityTitle }, compatibilityLabel),
                    Number.isFinite(plugin.stars) ? h('span', { className: 'ra-plugin-meta-item' },
                      h('span', { className: 'ra-star' }, '★'), compactNumber(plugin.stars),
                    ) : null,
                    plugin.packageName ? h('span', {
                      className: 'ra-plugin-meta-item',
                      title: t('downloads30d') + ' | ' + t('downloadsTotal'),
                    },
                      h(IconDownload, { size: 12 }), downloadsLabel,
                    ) : null,
                    freshnessLabel ? h('span', { className: 'ra-plugin-meta-item', title: freshnessAt },
                      h(IconClock, { size: 12 }), freshnessLabel,
                    ) : null,
                  ),
                  (plugin.tags ?? []).length ? h('div', { className: 'ra-plugin-tags' },
                    ...(plugin.tags ?? []).slice(0, 6).map(tag => h('span', { key: tag, className: 'ra-tag' }, tag)),
                  ) : null,
                ),
                h('div', { className: 'ra-plugin-actions' },
                  (() => {
                    const installState = installStates[pluginKey] ?? {}
                    const installed = isInstalled(plugin)
                    const busy = ['checking', 'starting', 'installing', 'applying'].includes(installState.phase)
                    const label = installed
                      ? t('installed')
                      : installState.phase === 'failed'
                        ? t('installRetry')
                        : installState.phase === 'checking'
                          ? t('installChecking')
                          : busy
                            ? t('installing')
                            : t('install')
                    const icon = installed
                      ? h(IconCheck, { size: 16 })
                      : busy
                        ? h(IconRefresh, { size: 16, className: 'ra-spin' })
                        : installState.phase === 'failed'
                          ? h(IconRefresh, { size: 16 })
                          : h(IconDownload, { size: 16 })
                    return plugin.installSpec ? h(IconButton, {
                      label: compatibilityStatus === 'incompatible' ? compatibilityTitle : installState.error || label,
                      state: installed ? 'done' : installState.phase === 'failed' ? 'error' : undefined,
                      disabled: installed || busy || compatibilityStatus === 'incompatible',
                      onClick: () => { void runInstall(plugin) },
                      icon,
                    }) : null
                  })(),
                  plugin.repository ? h('a', {
                    className: 'ra-plugin-link',
                    href: plugin.repository,
                    target: '_blank',
                    rel: 'noreferrer',
                    title: plugin.repository,
                    'aria-label': plugin.repository,
                  }, h(IconRightUp, { size: 14 })) : null,
                ),
                installStates[pluginKey]?.error
                  ? h('div', { className: 'ra-install-error', role: 'alert' }, installStates[pluginKey].error)
                  : null,
              )
            }),
          ),
        sorted.length > pageSize ? h('div', { className: 'ra-pagination' },
          h('div', { className: 'ra-pages' },
            h('button', {
              type: 'button',
              className: 'ra-page-button',
              disabled: currentPage <= 1,
              'aria-label': t('previousPage'),
              onClick: () => setPage(value => Math.max(1, value - 1)),
            }, '‹'),
            ...pageButtons,
            h('button', {
              type: 'button',
              className: 'ra-page-button',
              disabled: currentPage >= pageCount,
              'aria-label': t('nextPage'),
              onClick: () => setPage(value => Math.min(pageCount, value + 1)),
            }, '›'),
          ),
          h('span', { className: 'ra-plugin-meta' }, currentPage + ' / ' + pageCount),
        ) : null,
      )
    }

    function UpdatesView({ t }) {
      const [revision, setRevision] = React.useState(0)
      const [state, setState] = React.useState({ loading: true, items: [], error: '' })
      const [operations, setOperations] = React.useState({})

      React.useEffect(() => {
        let active = true
        const controller = new AbortController()
        const load = async () => {
          setState(current => ({ ...current, loading: true, error: '' }))
          try {
            const bundles = (await readInstalledBundles())
              .filter(bundle => bundle?.installed !== false && bundle?.name && bundle?.version)
            const rows = []
            for (let index = 0; index < bundles.length; index += 24) {
              const chunk = bundles.slice(index, index + 24)
              const value = await rpc('metadata', {
                items: chunk.map(bundle => ({ key: bundle.name, packageName: bundle.name })),
              }, controller.signal)
              rows.push(...(value?.plugins ?? []))
            }
            if (!active) return
            const byName = new Map(rows.map(row => [row.key, row]))
            const items = bundles.map(bundle => {
              const metadata = byName.get(bundle.name)
              const availableVersion = metadata?.version
              return {
                bundle,
                metadata,
                availableVersion,
                updateAvailable: Boolean(availableVersion && compareSemver(availableVersion, bundle.version) === 1),
              }
            }).filter(item => item.updateAvailable)
            setState({ loading: false, items, error: '' })
          } catch (error) {
            if (active && error?.name !== 'AbortError') setState({ loading: false, items: [], error: String(error?.message ?? error) })
          }
        }
        void load()
        const dispose = typeof remote?.$on === 'function'
          ? remote.$on('plugin-manager/changed', () => setRevision(value => value + 1))
          : undefined
        return () => {
          active = false
          controller.abort()
          if (typeof dispose === 'function') dispose()
        }
      }, [revision])

      const runUpdate = async item => {
        const key = item.bundle.name
        const current = operations[key]
        if (['starting', 'installing', 'applying'].includes(current?.phase)) return
        setOperations(value => ({ ...value, [key]: { phase: 'starting', error: '' } }))
        try {
          await updateInstalledPlugin(item.bundle, item.availableVersion, progress => {
            setOperations(value => ({ ...value, [key]: { ...(value[key] ?? {}), ...progress, error: '' } }))
          })
          setOperations(value => ({ ...value, [key]: { phase: 'done', error: '' } }))
          setRevision(value => value + 1)
        } catch (error) {
          setOperations(value => ({ ...value, [key]: { phase: 'failed', error: String(error?.message ?? error) } }))
        }
      }

      return h('section', { className: 'ra-section', 'aria-labelledby': 'ra-updates-title' },
        h('div', { className: 'ra-section-head' },
          h('div', null,
            h('h3', { id: 'ra-updates-title', className: 'ra-heading' }, t('updatesTitle')),
            h('p', { className: 'ra-lead' }, t('updatesLead')),
          ),
          h(IconButton, {
            label: t('updateRefresh'),
            disabled: state.loading,
            onClick: () => setRevision(value => value + 1),
            icon: h(IconRefresh, { size: 16, className: state.loading ? 'ra-spin' : undefined }),
          }),
        ),
        state.loading
          ? h('div', { className: 'ra-plugin-meta', role: 'status' }, t('updateChecking'))
          : state.error
            ? h('p', { className: 'ra-notice', role: 'alert' }, state.error)
            : state.items.length === 0
              ? h(Empty, { title: t('updateNone'), body: t('updateNoneBody') })
              : h('ul', { className: 'ra-update-list' },
                ...state.items.map(item => {
                  const key = item.bundle.name
                  const operation = operations[key] ?? {}
                  const busy = ['starting', 'installing', 'applying'].includes(operation.phase)
                  const done = operation.phase === 'done'
                  const failed = operation.phase === 'failed'
                  const compatibilityStatus = item.metadata?.compatibility === 'compatible'
                    ? 'compatible'
                    : item.metadata?.compatibility === 'unsupported'
                      ? 'incompatible'
                      : 'unverified'
                  const compatibilityLabel = compatibilityStatus === 'compatible'
                    ? t('compatible')
                    : compatibilityStatus === 'incompatible'
                      ? t('incompatible')
                      : t('notVerified')
                  const incompatible = compatibilityStatus === 'incompatible'
                  const label = failed
                    ? t('updateRetry')
                    : format(t, 'updateAction', { version: item.availableVersion })
                  return h('li', { key, className: 'ra-update-row' },
                    h('span', { className: 'ra-plugin-icon', 'aria-hidden': true }, h(PluginArtwork, { src: item.bundle?.meta?.icon })),
                    h('div', { className: 'ra-update-main' },
                      h('div', { className: 'ra-update-title' },
                        h('span', null, key),
                        h('span', { className: 'ra-compat-status', 'data-status': compatibilityStatus }, compatibilityLabel),
                      ),
                      h('div', { className: 'ra-update-version' }, format(t, 'updateAvailable', {
                        installed: 'v' + item.bundle.version,
                        available: 'v' + item.availableVersion,
                      })),
                      operation.error ? h('div', { className: 'ra-install-error', role: 'alert' }, operation.error) : null,
                    ),
                    h(IconButton, {
                      label,
                      state: done ? 'done' : failed ? 'error' : undefined,
                      disabled: busy || done || incompatible,
                      onClick: () => { void runUpdate(item) },
                      icon: done
                        ? h(IconCheck, { size: 16 })
                        : busy
                          ? h(IconRefresh, { size: 16, className: 'ra-spin' })
                          : h(IconUpdate, { size: 16 }),
                    }),
                  )
                }),
              ),
      )
    }

    function RegistryAggregator({ t, view }) {
      const [tab, setTab] = React.useState('sources')
      const formState = React.useSyncExternalStore(
        listener => sourceConfigForm.subscribe(listener),
        () => sourceConfigForm.getSnapshot(),
        () => sourceConfigForm.getSnapshot(),
      )
      const form = React.useMemo(() => ({
        state: formState,
        mutate: (operations, expectedRevision) => sourceConfigForm.mutate(operations, expectedRevision),
      }), [formState])
      if (view !== 'page') return null
      const tabs = [
        ['sources', t('sources')],
        ['browse', t('browse')],
        ['updates', t('updates')],
      ]
      const selectRelative = delta => {
        const index = tabs.findIndex(item => item[0] === tab)
        const next = tabs[(index + delta + tabs.length) % tabs.length][0]
        setTab(next)
      }
      const body = tab === 'browse'
        ? h(BrowseView, { t })
        : tab === 'updates'
          ? h(UpdatesView, { t })
          : h(SourcesView, { t, form })

      return h('div', { className: 'ra-root' },
        h('style', null, css),
        h('div', { className: 'ra-tabs', role: 'tablist', 'aria-label': 'Registry Aggregator' },
          ...tabs.map(([id, label]) => h('button', {
            key: id,
            type: 'button',
            role: 'tab',
            className: 'ra-tab',
            'aria-selected': tab === id,
            tabIndex: tab === id ? 0 : -1,
            onClick: () => setTab(id),
            onKeyDown: event => {
              if (event.key === 'ArrowRight') {
                event.preventDefault()
                selectRelative(1)
              } else if (event.key === 'ArrowLeft') {
                event.preventDefault()
                selectRelative(-1)
              }
            },
          }, label)),
        ),
        body,
      )
    }

    return {
      inject: ['slots', 'locale', 'connection', 'configForms', 'remote', 'remote.pluginManager'],
      apply(ctx) {
        connection = ctx.connection
        remote = ctx.remote
        sourceConfigForm = ctx.configForms.get(HOST_ENTRY)
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'registry-aggregator: locale')
        ctx.effect(() => ctx.configForms.whileServed([HOST_ENTRY], () =>
          ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
            name: 'plugins.bundle.config',
            key: PACKAGE,
            locale: NS,
          }, RegistryAggregator))), 'registry-aggregator: bundle page')
      },
    }
  },
})

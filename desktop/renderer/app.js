const bridge = window.toolkit;
const $ = (selector) => document.querySelector(selector);
let state = null;
let selectedView = 'live';
let busy = false;
let hasActivity = false;
let advanced = false;
let shellRunning = false;
let wizardStep = 0;
let wizardIdentity = '';
const titles = {
  live: 'Live TV',
  overview: 'Overview',
  screensavers: 'Screensavers',
  home: 'Home & live TV',
  settings: 'Device settings',
  activity: 'Activity',
  advanced: 'Advanced settings',
  terminal: 'TV terminal',
  setup: 'Setup assistant',
  update: 'Guided updater',
  about: 'About',
};
let channelPage = null;
let channelOffset = 0;
let channelRequest = 0;
let playingChannel = null;
let player = null;
let playRequest = 0;
let searchTimer;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function log(text) {
  if (!advanced) return;
  if (!hasActivity) {
    $('#activity-list').replaceChildren();
    hasActivity = true;
  }
  const row = element('li');
  row.append(
    element(
      'time',
      '',
      new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    ),
    document.createTextNode(text),
  );
  $('#activity-list').append(row);
  if ($('#activity-list').children.length > 300)
    $('#activity-list').firstChild.remove();
}

function showNotice(text, error = false) {
  const notice = $('#notice');
  notice.textContent = text;
  notice.hidden = !text;
  notice.classList.toggle('error', error);
}

function navigate(view) {
  if ((view === 'activity' || view === 'terminal') && !advanced)
    view = 'advanced';
  const changed = view !== selectedView;
  selectedView = view;
  const standalone = [
    'live',
    'activity',
    'advanced',
    'terminal',
    'about',
  ].includes(view);
  const wizard = prepareWizard(view, changed);
  renderPageHeading(view, wizard);
  $('#connection-form').hidden = standalone && view !== 'terminal';
  $('#refresh').hidden = standalone && view !== 'terminal';
  document.querySelectorAll('.nav-button').forEach((button) => {
    button.classList.toggle('selected', button.dataset.view === view);
    if (button.dataset.view === view)
      button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $('#welcome').hidden = !!state || standalone;
  $('#connected-views').hidden = !state || standalone;
  document.querySelectorAll('.view').forEach((section) => {
    section.hidden =
      section.id !== `view-${wizard ? 'assistant' : view}` ||
      (wizard && !state);
  });
  if (changed) window.scrollTo(0, 0);
}

function prepareWizard(view, changed) {
  const wizard = view === 'setup' || view === 'update';
  if (
    wizard &&
    state &&
    (changed || wizardIdentity !== `${view}:${state.device.ip}`)
  )
    initializeWizard();
  return wizard;
}

function renderPageHeading(view, wizard) {
  $('#page-title').textContent = titles[view];
  $('#page-subtitle').textContent =
    view === 'live'
      ? 'Public IPTV channels from around the world.'
      : view === 'about'
        ? 'Independent tools for online TV and your Fire TV.'
        : wizard
          ? 'Choose, review and apply changes to your connected TV.'
          : 'Screensavers, home screens and device settings.';
  $('#footer-note').textContent =
    view === 'live'
      ? 'Channel sources provided by iptv-org.'
      : view === 'terminal'
        ? 'Shell commands run directly on the connected TV.'
        : 'Changes are confirmed before they run.';
}

function updateControls() {
  document.body.classList.toggle('busy', busy);
  document
    .querySelectorAll('[data-task], .setting-row button')
    .forEach((button) => {
      button.disabled = busy || !state || button.dataset.unavailable === 'true';
    });
  $('#connect').disabled = busy;
  $('#address').disabled = busy;
  $('#refresh').disabled = busy || !state;
  $('#advanced-toggle').disabled = busy;
  $('#run-shell').disabled = busy || !advanced || !state;
  $('#terminal-command').disabled = busy || !advanced || !state;
  $('#stop-shell').disabled = !shellRunning;
  $('#clear-terminal').disabled = shellRunning;
  $('#assistant-apply').disabled = busy || !state;
  $('#assistant-next').disabled = busy || !state;
  $('#assistant-back').disabled = busy || wizardStep === 0;
  $('#assistant-form')
    .querySelectorAll('input, select')
    .forEach((input) => {
      input.disabled = busy;
    });
  $('#setup-sleep').disabled = busy || !$('#setup-timers').checked;
  $('#setup-delay').disabled = busy || !$('#setup-timers').checked;
  $('#terminal-target').textContent = state
    ? `Commands run on ${state.device.model} at ${state.device.ip}:5555.`
    : 'Connect a Fire TV to run commands.';
  $('#connect').textContent = busy
    ? 'Working...'
    : state
      ? 'Connect again'
      : 'Connect';
}

async function run(work, success) {
  if (busy) return;
  busy = true;
  showNotice('');
  $('#task-status').textContent = 'Working...';
  updateControls();
  try {
    const result = await work();
    if (!result.ok) {
      if (!result.connected) {
        state = null;
        render();
      } else if (result.state) {
        state = result.state;
        render();
      }
      throw new Error(result.error);
    }
    await success(result.data);
  } catch (error) {
    showNotice(error.message, true);
    log(error.message);
  } finally {
    busy = false;
    $('#task-status').textContent = state ? 'Ready' : 'Ready to connect';
    updateControls();
  }
}

function taskButton(text, type, id, style = '') {
  const button = element('button', style, text);
  button.dataset.task = type;
  if (id) button.dataset.id = id;
  return button;
}

function appRow(name, description, badge, active) {
  const row = element('div', 'app-row');
  const info = element('div', 'app-info');
  const title = element('h3', '', name);
  title.append(element('span', `app-badge${active ? ' active' : ''}`, badge));
  info.append(title);
  if (description) info.append(element('p', '', description));
  const actions = element('div', 'actions');
  row.append(info, actions);
  return { row, actions };
}

function renderSavers() {
  if (!state) return;
  const query = $('#saver-search').value.trim().toLowerCase();
  const entries = state.screensavers.filter((entry) =>
    entry.name.toLowerCase().includes(query),
  );
  const list = $('#saver-list');
  list.replaceChildren();
  for (const entry of entries) {
    const { row, actions } = appRow(
      entry.name,
      entry.description,
      entry.active ? 'Active' : entry.installed ? 'Installed' : 'Available',
      entry.active,
    );
    if (entry.installed) {
      if (!entry.active)
        actions.append(taskButton('Use', 'activate-screensaver', entry.id));
      if (entry.downloadable) {
        actions.append(
          taskButton('Update', 'install-screensaver', entry.id, 'secondary'),
        );
        if (!entry.active)
          actions.append(
            taskButton('Remove', 'remove-screensaver', entry.id, 'quiet'),
          );
      }
    } else if (entry.downloadable)
      actions.append(taskButton('Install', 'install-screensaver', entry.id));
    list.append(row);
  }
  $('#no-savers').hidden = entries.length !== 0;
  updateControls();
}

function renderHome() {
  const list = $('#launcher-list');
  list.replaceChildren();
  const launchers = [
    { id: 'amazon', name: 'Amazon Home', installed: true },
    ...state.launchers,
  ];
  for (const launcher of launchers) {
    const active = state.home === launcher.id;
    const description =
      launcher.id === 'amazon'
        ? 'The original Fire TV home screen.'
        : 'Installed with Home Redirect for the remote Home button.';
    const { row, actions } = appRow(
      launcher.name,
      description,
      active ? 'Active' : launcher.installed ? 'Installed' : 'Available',
      active,
    );
    if (launcher.id !== 'amazon')
      actions.append(
        taskButton(
          launcher.installed ? 'Update' : 'Install',
          'install-launcher',
          launcher.id,
          launcher.installed ? 'secondary' : '',
        ),
      );
    if (
      !active &&
      launcher.installed &&
      (launcher.id === 'amazon' || state.homeRedirectInstalled)
    )
      actions.append(taskButton('Use', 'home', launcher.id));
    list.append(row);
  }
  $('#open-owntv').dataset.unavailable = String(!state.ownTvInstalled);
  $('#playlist').value = state.playlist;
}

function render() {
  document.body.classList.toggle('connected', !!state);
  $('#connection-label').textContent = state
    ? 'TV connected'
    : 'No TV connected';
  $('#device-summary').textContent = state
    ? `${state.device.model} at ${state.device.ip}`
    : "Use the IP address shown in your TV's network settings.";
  if (state) {
    $('#model').textContent = state.device.model;
    $('#device-details').textContent =
      `${state.device.ip}${state.device.android ? ` / Android ${state.device.android}` : ''}`;
    $('#active-saver').textContent =
      state.screensavers.find((entry) => entry.active)?.name ||
      'Custom screensaver';
    $('#active-home').textContent =
      state.launchers.find((entry) => entry.id === state.home)?.name ||
      'Amazon Home';
    $('#alexa-state').textContent = state.alexaEnabled ? 'Enabled' : 'Disabled';
    $('#alexa-toggle').textContent = state.alexaEnabled
      ? 'Disable Alexa wake'
      : 'Enable Alexa wake';
    $('#alexa-toggle').dataset.value = String(!state.alexaEnabled);
    $('#sleep-minutes').value =
      state.sleepMs === null ? '' : Number((state.sleepMs / 60000).toFixed(2));
    $('#screensaver-minutes').value =
      state.screensaverMs === null
        ? ''
        : Number((state.screensaverMs / 60000).toFixed(2));
    $('#guard-state').textContent = state.guardConfigured
      ? 'Protection was enabled from this desktop app.'
      : 'Protection has not been enabled from this desktop app. The TV may have protection configured by another client.';
    renderSavers();
    renderHome();
  }
  navigate(selectedView);
  updateControls();
}

async function action(request) {
  await run(
    () => bridge.action(request),
    (result) => {
      if (result.cancelled) {
        showNotice('Task cancelled.');
        return;
      }
      state = result.state;
      render();
      showNotice(result.message);
    },
  );
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.view || button.dataset.navigate)
    navigate(button.dataset.view || button.dataset.navigate);
  if (button.dataset.link)
    bridge
      .openLink(button.dataset.link)
      .then((result) => {
        if (!result.ok) showNotice(result.error, true);
      })
      .catch((error) => showNotice(error.message, true));
  if (button.dataset.task) {
    const request = { type: button.dataset.task };
    if (button.dataset.id) request.id = button.dataset.id;
    if (button.dataset.value !== undefined)
      request.value = button.dataset.value === 'true';
    action(request);
  }
});

$('#connection-form').addEventListener('submit', (event) => {
  event.preventDefault();
  run(
    () => bridge.connect($('#address').value.trim()),
    (result) => {
      state = result;
      render();
      showNotice(`Connected to ${state.device.model}.`);
      log(`Connected to ${state.device.model} at ${state.device.ip}.`);
    },
  );
});
$('#refresh').addEventListener('click', () =>
  run(
    () => bridge.refresh(),
    (result) => {
      state = result;
      render();
      showNotice('TV settings refreshed.');
    },
  ),
);
$('#saver-search').addEventListener('input', renderSavers);
for (const id of ['sleep', 'screensaver']) {
  $(`#${id}-form`).addEventListener('submit', (event) => {
    event.preventDefault();
    action({
      type: 'timeout',
      id,
      value: Math.round(Number($(`#${id}-minutes`).value) * 60000),
    });
  });
}
$('#clear-activity').addEventListener('click', () => {
  $('#activity-list').replaceChildren(
    element('li', 'muted', 'Activity cleared.'),
  );
  hasActivity = false;
});

function option(value, text) {
  const node = element('option', '', text);
  node.value = value;
  return node;
}

function initializeWizard() {
  wizardIdentity = `${selectedView}:${state.device.ip}`;
  wizardStep = 0;
  $('#setup-screensaver').replaceChildren(
    option('keep', 'Keep current screensaver'),
  );
  for (const entry of state.screensavers.filter(
    (entry) => entry.downloadable || entry.installed,
  ))
    $('#setup-screensaver').append(option(entry.id, entry.name));
  $('#setup-home').replaceChildren(
    option('keep', 'Keep current home screen'),
    option('amazon', 'Amazon Home'),
  );
  for (const entry of state.launchers)
    $('#setup-home').append(option(entry.id, entry.name));
  $('#setup-owntv').checked = !state.ownTvInstalled;
  $('#setup-timers').checked = false;
  $('#setup-sleep').value = state.sleepMs === null ? 20 : state.sleepMs / 60000;
  $('#setup-delay').value =
    state.screensaverMs === null ? 5 : state.screensaverMs / 60000;
  $('#setup-alexa').value = 'keep';
  $('#setup-guard').value = 'keep';
  $('#setup-optimize').checked = false;
  const list = $('#update-app-list');
  list.replaceChildren();
  const updates = [
    ...state.screensavers
      .filter((entry) => entry.downloadable && entry.installed)
      .map((entry) => ({ ...entry, kind: 'screensavers' })),
    ...state.launchers
      .filter((entry) => entry.installed)
      .map((entry) => ({ ...entry, kind: 'launchers' })),
    ...(state.ownTvInstalled
      ? [{ id: 'owntv', name: 'OwnTV', kind: 'ownTv' }]
      : []),
  ];
  for (const entry of updates) {
    const label = element('label', 'check-choice');
    const input = element('input');
    input.type = 'checkbox';
    input.checked = true;
    input.dataset.updateKind = entry.kind;
    input.value = entry.id;
    label.append(input, document.createTextNode(entry.name));
    list.append(label);
  }
  if (!updates.length)
    list.append(
      element(
        'p',
        'empty',
        'No supported apps are installed yet. Use Setup assistant to add them.',
      ),
    );
  $('#assistant-progress').textContent = '';
  renderWizardStep();
}

for (const [id, checked] of [
  ['select-updates', true],
  ['clear-updates', false],
])
  $(`#${id}`).addEventListener('click', () => {
    if (!busy)
      $('#update-app-list')
        .querySelectorAll('input')
        .forEach((input) => {
          input.checked = checked;
        });
  });

function wizardRequest() {
  if (selectedView === 'update') {
    const request = {
      mode: 'update',
      screensavers: [],
      launchers: [],
      ownTv: false,
    };
    $('#update-app-list')
      .querySelectorAll('input:checked')
      .forEach((input) => {
        if (input.dataset.updateKind === 'ownTv') request.ownTv = true;
        else request[input.dataset.updateKind].push(input.value);
      });
    return request;
  }
  const request = {
    mode: 'setup',
    screensaver: $('#setup-screensaver').value,
    home: $('#setup-home').value,
    ownTv: $('#setup-owntv').checked,
    optimize: $('#setup-optimize').checked,
  };
  if ($('#setup-timers').checked) {
    request.sleepMs = Math.round(Number($('#setup-sleep').value) * 60000);
    request.screensaverMs = Math.round(Number($('#setup-delay').value) * 60000);
  }
  for (const key of ['alexa', 'guard']) {
    const value = $(`#setup-${key}`).value;
    if (value !== 'keep') request[key] = value === 'on';
  }
  return request;
}

function renderWizardStep() {
  const updating = selectedView === 'update';
  $('#setup-app-choices').hidden = updating;
  $('#update-app-choices').hidden = !updating;
  $('#setup-setting-choices').hidden = updating;
  $('#update-setting-note').hidden = !updating;
  for (const [index, name] of ['apps', 'settings', 'review'].entries())
    $(`#assistant-${name}`).hidden = wizardStep !== index;
  document.querySelectorAll('[data-step]').forEach((node) => {
    if (Number(node.dataset.step) === wizardStep)
      node.setAttribute('aria-current', 'step');
    else node.removeAttribute('aria-current');
  });
  $('#assistant-next').hidden = wizardStep === 2;
  $('#assistant-apply').hidden = wizardStep !== 2;
  $('#assistant-target').textContent =
    `Apply to ${state.device.model} at ${state.device.ip}:5555.`;
  $('#assistant-apply').textContent = updating
    ? 'Review and update'
    : 'Review and install';
  if (wizardStep === 2) {
    const summary = $('#assistant-summary');
    summary.replaceChildren();
    const add = (text) => summary.append(element('li', '', text));
    const request = wizardRequest();
    if (updating) {
      $('#update-app-list')
        .querySelectorAll('input:checked')
        .forEach((input) => add(`Refresh ${input.parentElement.textContent}`));
      if (!summary.children.length) add('No app updates selected.');
      add('Keep current home screen, screensaver selection and timers.');
    } else {
      add(
        `Screensaver: ${$('#setup-screensaver').selectedOptions[0].textContent}`,
      );
      add(`Home screen: ${$('#setup-home').selectedOptions[0].textContent}`);
      if (request.ownTv)
        add(
          'Install OwnTV if needed. Add the IPTV playlist in OwnTV after setup.',
        );
      if (request.sleepMs !== undefined)
        add(
          `Sleep: ${request.sleepMs / 60000} minutes. Screensaver: ${request.screensaverMs / 60000} minutes.`,
        );
      for (const key of ['alexa', 'guard'])
        if (request[key] !== undefined)
          add(
            `${key === 'alexa' ? 'Alexa wake' : 'Protection'}: ${request[key] ? 'on' : 'off'}`,
          );
      if (request.optimize) add('Apply recommended screensaver optimizations.');
      if (
        request.sleepMs !== undefined &&
        request.sleepMs > 0 &&
        request.screensaverMs >= request.sleepMs
      )
        add(
          'Your screensaver timer is at least as long as the sleep timer. The TV may sleep before showing the screensaver.',
        );
    }
  }
  updateControls();
}

$('#assistant-next').addEventListener('click', () => {
  if (
    wizardStep === 1 &&
    selectedView === 'setup' &&
    $('#setup-timers').checked &&
    (!$('#setup-sleep').reportValidity() || !$('#setup-delay').reportValidity())
  )
    return;
  wizardStep = Math.min(2, wizardStep + 1);
  renderWizardStep();
});
$('#assistant-back').addEventListener('click', () => {
  wizardStep = Math.max(0, wizardStep - 1);
  renderWizardStep();
});
$('#setup-timers').addEventListener('change', updateControls);
$('#assistant-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (wizardStep !== 2) return;
  run(
    () => bridge.assistant(wizardRequest()),
    (result) => {
      if (result.cancelled) {
        showNotice('Guided changes cancelled.');
        return;
      }
      state = result.state;
      render();
      showNotice(result.message);
      $('#assistant-progress').textContent = result.message;
      log(result.message);
    },
  );
});

function addIcons() {
  const ns = 'http://www.w3.org/2000/svg';
  for (const button of document.querySelectorAll('.nav-button, [data-link]')) {
    const icon = document.createElementNS(ns, 'svg');
    icon.setAttribute('class', 'icon');
    icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', `#icon-${button.dataset.view || 'link'}`);
    icon.append(use);
    button.prepend(icon);
  }
}
addIcons();

function renderAdvanced() {
  document.querySelectorAll('[data-advanced]').forEach((node) => {
    node.hidden = !advanced;
  });
  $('#advanced-toggle').setAttribute('aria-checked', String(advanced));
  $('#advanced-toggle').textContent = advanced
    ? 'Disable Advanced settings'
    : 'Enable Advanced settings';
  $('#advanced-status').textContent = advanced
    ? 'Advanced settings are on. Activity and TV terminal are available in the sidebar.'
    : 'Advanced settings are off.';
  if (!advanced) {
    $('#activity-list').replaceChildren();
    hasActivity = false;
    $('#terminal-output').textContent = 'Command output appears here.';
    $('#terminal-command').value = '';
  }
  navigate(selectedView);
  updateControls();
}

function terminalOutput(text) {
  const output = $('#terminal-output');
  output.textContent = (output.textContent + text).slice(-262144);
  output.scrollTop = output.scrollHeight;
}

$('#advanced-toggle').addEventListener('click', () =>
  run(
    () => bridge.advanced(!advanced),
    (result) => {
      advanced = result.advanced;
      renderAdvanced();
      if (result.cancelled) showNotice('Advanced settings remain off.');
    },
  ),
);
$('#terminal-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!advanced || !state || busy) return;
  const command = $('#terminal-command').value;
  $('#terminal-output').textContent = `${state.device.ip}:5555 $ ${command}\n`;
  $('#terminal-status').textContent = 'Running...';
  shellRunning = true;
  run(
    () => bridge.shell(command),
    (result) => {
      const status =
        result.stopped === 'timeout'
          ? 'Stopped after 60 seconds'
          : result.stopped === 'output-limit'
            ? 'Stopped at the output limit'
            : result.stopped
              ? 'Stopped'
              : `Exit ${result.code ?? result.signal}`;
      $('#terminal-status').textContent = status;
      terminalOutput(`\n[${status}]\n`);
    },
  ).finally(() => {
    shellRunning = false;
    if ($('#terminal-status').textContent === 'Running...')
      $('#terminal-status').textContent = 'Command failed';
    updateControls();
  });
});
$('#stop-shell').addEventListener('click', async () => {
  const result = await bridge.stopShell();
  if (!result.ok) showNotice(result.error, true);
});
$('#clear-terminal').addEventListener('click', () => {
  $('#terminal-output').textContent = '';
});

if (bridge) {
  bridge.onShellOutput((output) => {
    if (advanced && shellRunning) terminalOutput(output.text);
  });
  bridge.onProgress((text) => {
    log(text);
    $('#task-status').textContent = text;
    if (selectedView === 'setup' || selectedView === 'update')
      $('#assistant-progress').textContent = text;
  });
  bridge
    .initial()
    .then((result) => {
      if (!result.ok) {
        showNotice(result.error, true);
        return;
      }
      $('#address').value = result.data.savedIp;
      $('#version').textContent = `Desktop ${result.data.version}`;
      $('#about-version').textContent =
        `Desktop version ${result.data.version}`;
      advanced = result.data.advanced;
      renderAdvanced();
    })
    .catch((error) => showNotice(error.message, true));
  loadChannels();
} else
  showNotice(
    'Open this interface through the Fire TV Toolkit desktop app.',
    true,
  );

function filters() {
  return {
    search: $('#channel-search').value,
    country: $('#channel-country').value,
    language: $('#channel-language').value,
    category: $('#channel-category').value,
    favorites: $('#channel-favorites').checked,
    offset: channelOffset,
  };
}

function fillOptions(selector, entries, empty) {
  const select = $(selector);
  const previous = select.value;
  select.replaceChildren();
  const all = element('option', '', empty);
  all.value = '';
  select.append(all);
  for (const entry of entries) {
    const option = element('option', '', entry.name);
    option.value = entry.id;
    select.append(option);
  }
  select.value = previous;
}

async function loadChannels(refresh = false) {
  const request = ++channelRequest;
  $('#reload-channels').disabled = true;
  try {
    const result = await bridge.channels(filters(), refresh);
    if (request !== channelRequest) return;
    if (!result.ok) throw new Error(result.error);
    channelPage = result.data;
    fillOptions('#channel-country', channelPage.countries, 'All countries');
    fillOptions('#channel-language', channelPage.languages, 'All languages');
    fillOptions('#channel-category', channelPage.categories, 'All categories');
    $('#catalog-count').textContent =
      `${channelPage.catalogTotal.toLocaleString()} channels / ${channelPage.streamTotal.toLocaleString()} sources${channelPage.cached ? ' / saved catalog' : ''}`;
    const list = $('#channel-list');
    list.replaceChildren();
    for (const channel of channelPage.channels) {
      const row = element('div', 'channel-row');
      row.classList.toggle('playing', playingChannel?.id === channel.id);
      const play = element('button', 'channel-play');
      play.dataset.channelId = channel.id;
      const details = element('span', 'channel-description');
      details.append(
        element('strong', '', channel.name),
        element(
          'small',
          '',
          [
            channel.country,
            ...channel.categories,
            `${channel.sources.length} ${channel.sources.length === 1 ? 'source' : 'sources'}`,
          ]
            .filter(Boolean)
            .join(' / '),
        ),
      );
      play.append(
        element('span', 'channel-initials', channel.name.slice(0, 2)),
        details,
      );
      const favorite = element(
        'button',
        'channel-favorite',
        channel.favorite ? 'Saved' : 'Save',
      );
      favorite.dataset.favoriteId = channel.id;
      favorite.dataset.saved = String(channel.favorite);
      favorite.setAttribute(
        'aria-label',
        `${channel.favorite ? 'Remove' : 'Save'} ${channel.name} ${channel.favorite ? 'from' : 'to'} favorites`,
      );
      row.append(play, favorite);
      list.append(row);
    }
    if (!channelPage.channels.length)
      list.append(
        element(
          'p',
          'empty',
          'No channels match these filters. Try a different search or country.',
        ),
      );
    $('#channel-page').textContent = channelPage.total
      ? `${channelOffset + 1} to ${Math.min(channelOffset + 100, channelPage.total)} of ${channelPage.total.toLocaleString()}`
      : 'No matches';
    $('#previous-channels').disabled = channelOffset === 0;
    $('#next-channels').disabled = channelOffset + 100 >= channelPage.total;
  } catch (error) {
    if (request === channelRequest) {
      $('#catalog-count').textContent = 'Channel catalog unavailable';
      showNotice(error.message, true);
    }
  } finally {
    if (request === channelRequest) $('#reload-channels').disabled = false;
  }
}

function stopPlayer() {
  if (player) {
    player.destroy();
    player = null;
  }
  const video = $('#iptv-video');
  video.pause();
  video.removeAttribute('src');
  video.load();
}

async function playSource(index) {
  if (!playingChannel) return;
  const request = ++playRequest;
  const channel = playingChannel;
  const source = channel.sources[index];
  if (!source) return;
  stopPlayer();
  $('#player-placeholder').hidden = true;
  $('#player-status').textContent = `Connecting to ${channel.name}...`;
  $('#playing-title').textContent = channel.name;
  $('#stream-source').value = String(index);
  $('.source-controls').hidden = false;
  $('#next-source').disabled = channel.sources.length < 2;
  try {
    const result = await bridge.source(channel.id, source.id);
    if (request !== playRequest) return;
    if (!result.ok) throw new Error(result.error);
    const video = $('#iptv-video');
    const url = result.data.url;
    if (/\.m3u8(?:[?#]|$)/i.test(url) && window.Hls?.isSupported()) {
      player = new window.Hls({ enableWorker: false, maxBufferLength: 30 });
      player.loadSource(url);
      player.attachMedia(video);
      player.on(window.Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          $('#player-status').textContent =
            'Press Play in the video controls to watch.';
        });
      });
      player.on(window.Hls.Events.ERROR, (_event, data) => {
        if (request === playRequest && data.fatal) {
          $('#player-status').textContent =
            'This source could not play. Try another source or channel.';
          stopPlayer();
        }
      });
    } else {
      video.src = url;
      video.play().catch(() => {
        if (request === playRequest)
          $('#player-status').textContent =
            'This source could not play. Try another source or channel.';
      });
    }
    log(`Selected IPTV channel: ${channel.name}.`);
  } catch (error) {
    if (request === playRequest)
      $('#player-status').textContent = error.message;
  }
}

function chooseChannel(channel) {
  playingChannel = channel;
  const select = $('#stream-source');
  select.replaceChildren();
  channel.sources.forEach((source, index) => {
    const option = element(
      'option',
      '',
      [`Source ${index + 1}`, source.title, source.quality, ...source.labels]
        .filter(Boolean)
        .join(' / '),
    );
    option.value = String(index);
    select.append(option);
  });
  document
    .querySelectorAll('.channel-row')
    .forEach((row) =>
      row.classList.toggle(
        'playing',
        row.querySelector('[data-channel-id]').dataset.channelId === channel.id,
      ),
    );
  playSource(0);
}

$('#channel-list').addEventListener('click', async (event) => {
  const channelButton = event.target.closest('[data-channel-id]');
  if (channelButton) {
    const channel = channelPage?.channels.find(
      (entry) => entry.id === channelButton.dataset.channelId,
    );
    if (channel) chooseChannel(channel);
  }
  const favoriteButton = event.target.closest('[data-favorite-id]');
  if (favoriteButton) {
    favoriteButton.disabled = true;
    try {
      const result = await bridge.favorite(
        favoriteButton.dataset.favoriteId,
        favoriteButton.dataset.saved !== 'true',
      );
      if (!result.ok) throw new Error(result.error);
      await loadChannels();
    } catch (error) {
      showNotice(error.message, true);
      favoriteButton.disabled = false;
    }
  }
});
$('#channel-search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    channelOffset = 0;
    loadChannels();
  }, 200);
});
for (const selector of [
  '#channel-country',
  '#channel-language',
  '#channel-category',
  '#channel-favorites',
])
  $(selector).addEventListener('change', () => {
    channelOffset = 0;
    loadChannels();
  });
$('#reload-channels').addEventListener('click', () => {
  channelOffset = 0;
  loadChannels(true);
});
$('#previous-channels').addEventListener('click', () => {
  channelOffset = Math.max(0, channelOffset - 100);
  loadChannels();
  $('#channel-list').scrollTop = 0;
});
$('#next-channels').addEventListener('click', () => {
  channelOffset += 100;
  loadChannels();
  $('#channel-list').scrollTop = 0;
});
$('#stream-source').addEventListener('change', () =>
  playSource(Number($('#stream-source').value)),
);
$('#next-source').addEventListener('click', () => {
  if (playingChannel)
    playSource(
      (Number($('#stream-source').value) + 1) % playingChannel.sources.length,
    );
});
$('#stop-stream').addEventListener('click', () => {
  playRequest++;
  stopPlayer();
  bridge.stop();
  $('#player-placeholder').hidden = false;
  $('#player-status').textContent =
    'Playback stopped. Choose another channel to watch.';
});
$('#iptv-video').addEventListener('playing', () => {
  $('#player-status').textContent =
    `Watching ${playingChannel?.name || 'live TV'}.`;
});
$('#iptv-video').addEventListener('waiting', () => {
  if (playingChannel) $('#player-status').textContent = 'Buffering...';
});
$('#iptv-video').addEventListener('error', () => {
  if (playingChannel)
    $('#player-status').textContent =
      'This source could not play. Try another source or channel.';
});

(function () {
  'use strict';

  var serviceSel = document.getElementById('bk-service');
  var dateInput = document.getElementById('bk-date');
  var timesWrap = document.getElementById('bk-times');
  var timesHint = document.getElementById('bk-times-hint');
  var nomeInput = document.getElementById('bk-nome');
  var telInput = document.getElementById('bk-telefone');
  var confirmBtn = document.getElementById('bk-confirmar');
  var feedback = document.getElementById('bk-feedback');

  if (!serviceSel) return; // seção não presente nesta página

  var services = [];
  var selectedTime = null; // ISO string

  function todayInSP() {
    var now = new Date();
    var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    return map.year + '-' + map.month + '-' + map.day;
  }

  function centsToBRL(cents) {
    if (cents == null) return 'a combinar';
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function loadServices() {
    fetch('/api/services')
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (data) {
        services = data.services || [];
        if (!services.length) {
          serviceSel.innerHTML = '<option value="">Nenhum serviço disponível</option>';
          return;
        }
        var byCategory = {};
        services.forEach(function (s) {
          byCategory[s.category] = byCategory[s.category] || [];
          byCategory[s.category].push(s);
        });
        var html = '<option value="">Selecione um serviço</option>';
        Object.keys(byCategory).forEach(function (cat) {
          html += '<optgroup label="' + cat + '">';
          byCategory[cat].forEach(function (s) {
            html += '<option value="' + s.id + '">' + s.name + ' — ' + centsToBRL(s.price_cents) + '</option>';
          });
          html += '</optgroup>';
        });
        serviceSel.innerHTML = html;
      })
      .catch(function () {
        serviceSel.innerHTML = '<option value="">Não foi possível carregar os serviços</option>';
      });
  }

  function resetTimes(message) {
    selectedTime = null;
    timesWrap.innerHTML = '';
    timesHint.textContent = message || '';
    timesHint.hidden = !message;
    updateConfirmState();
  }

  function loadAvailability() {
    var serviceId = serviceSel.value;
    var date = dateInput.value;
    if (!serviceId || !date) {
      resetTimes('Escolha o serviço e a data primeiro.');
      return;
    }
    resetTimes('Carregando horários...');
    timesHint.hidden = false;

    fetch('/api/availability?date=' + encodeURIComponent(date) + '&service_id=' + encodeURIComponent(serviceId))
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (data) {
        var slots = data.slots || [];
        if (!slots.length) {
          timesHint.textContent = data.reason || 'Nenhum horário livre nesse dia.';
          timesHint.hidden = false;
          return;
        }
        timesHint.hidden = true;
        timesWrap.innerHTML = '';
        slots.forEach(function (iso) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'time-slot';
          btn.setAttribute('aria-pressed', 'false');
          btn.textContent = new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
          btn.addEventListener('click', function () {
            selectedTime = iso;
            timesWrap.querySelectorAll('.time-slot').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
            btn.setAttribute('aria-pressed', 'true');
            updateConfirmState();
          });
          timesWrap.appendChild(btn);
        });
      })
      .catch(function () {
        timesHint.textContent = 'Não foi possível carregar os horários. Tente novamente.';
        timesHint.hidden = false;
      });
  }

  function updateConfirmState() {
    var ok = selectedTime && nomeInput.value.trim().length > 1 && telInput.value.trim().length >= 8;
    confirmBtn.disabled = !ok;
  }

  function confirmBooking() {
    feedback.className = 'booking-feedback';
    feedback.textContent = '';
    confirmBtn.disabled = true;

    fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: Number(serviceSel.value),
        customer_name: nomeInput.value.trim(),
        customer_phone: telInput.value.trim(),
        starts_at: selectedTime,
      }),
    })
      .then(function (r) {
        return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; });
      })
      .then(function (res) {
        if (!res.ok) {
          feedback.className = 'booking-feedback error';
          feedback.textContent = res.data.error || 'Não foi possível agendar. Tente outro horário.';
          if (res.status === 409) loadAvailability();
          updateConfirmState();
          return;
        }
        var quando = new Date(res.data.appointment.starts_at).toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        });
        feedback.className = 'booking-feedback ok';
        feedback.textContent = 'Agendado! ' + quando + '. Se precisar remarcar, chama no WhatsApp.';
        resetTimes('Escolha o serviço e a data primeiro.');
        serviceSel.value = '';
        nomeInput.value = '';
        telInput.value = '';
      })
      .catch(function () {
        feedback.className = 'booking-feedback error';
        feedback.textContent = 'Erro de conexão. Tente novamente.';
        updateConfirmState();
      });
  }

  dateInput.min = todayInSP();
  var maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  dateInput.max = maxDate.toISOString().slice(0, 10);

  serviceSel.addEventListener('change', loadAvailability);
  dateInput.addEventListener('change', loadAvailability);
  nomeInput.addEventListener('input', updateConfirmState);
  telInput.addEventListener('input', updateConfirmState);
  confirmBtn.addEventListener('click', confirmBooking);

  loadServices();
  resetTimes('Escolha o serviço e a data primeiro.');
})();

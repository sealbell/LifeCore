window.__ModuleLoader__.load({
  id: 'lifecore-dsh',
  factory(require) {
    const React = require('react');
    function Panel() {
      return React.createElement('iframe', { src: '/lifecore/', title: 'LifeCore 生命核心', style: { width: '100%', height: 'calc(100vh - 130px)', minHeight: '650px', border: 0, borderRadius: '12px' } });
    }
    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register(
          { name: 'settings.section', id: 'lifecore-dsh', order: 8, label: () => '生命核心' }, Panel,
        ), 'LifeCore settings'), 'LifeCore settings');
      },
    };
  },
});

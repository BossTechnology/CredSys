"use client";

import { useState } from "react";

type NotifyAction = (formData: FormData) => void | Promise<void>;

interface WatchlistNotifyFormProps {
  action:  NotifyAction;
  entryId: string;
  initial: {
    notify_on_accredited:         boolean;
    notify_on_evaluator_assigned: boolean;
    notify_on_status_change:      boolean;
  };
  labels: {
    accredited: string;
    evaluator:  string;
    status:     string;
    save:       string;
  };
}

export function WatchlistNotifyForm({ action, entryId, initial, labels }: WatchlistNotifyFormProps) {
  const [flags, setFlags] = useState(initial);

  const options: { key: keyof typeof flags; label: string }[] = [
    { key: "notify_on_accredited",         label: labels.accredited },
    { key: "notify_on_evaluator_assigned", label: labels.evaluator  },
    { key: "notify_on_status_change",      label: labels.status     },
  ];

  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="entry_id" value={entryId} />
      {options.map((o) => (
        <label key={o.key} className="flex items-center gap-1.5 text-[14px] font-mono text-cs-500">
          <input type="hidden" name={o.key} value={flags[o.key] ? "true" : "false"} />
          <input
            type="checkbox"
            checked={flags[o.key]}
            onChange={(e) => setFlags((f) => ({ ...f, [o.key]: e.target.checked }))}
            className="w-3 h-3"
          />
          {o.label}
        </label>
      ))}
      <button type="submit" className="text-[14px] font-mono text-cs-400 hover:text-black uppercase tracking-widest mt-1">
        {labels.save}
      </button>
    </form>
  );
}

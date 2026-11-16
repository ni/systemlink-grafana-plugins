# SystemLink TDM Reader

An interactive **mockup** using built-in sample files and channels. It does not
read TDM/TDMS files, contact SystemLink, or require a URL or credentials.

## Setup

Build and run Grafana using the repository's [getting started instructions](../../../README.md#getting-started).
Add the **SystemLink TDM Reader** data source, then select **Save & test**.
This reports mock readiness only, not backend connectivity.
Choose this data source in a dashboard query and use a **Table** visualization.
The root webpack configuration extends Grafana's generated configuration to
resolve the extensionless ESM imports in Nimble and its NI dependencies.

## Standalone HTML mockup

Run `npm run build:tdm-mockup` from the repository root to generate
`mockups/systemlink-tdm-reader.html`. Open that file directly in a browser, or
host it with your page and embed it:

```html
<iframe src="systemlink-tdm-reader.html" title="SystemLink TDM Reader"
  style="width: 100%; height: 850px; border: 0"></iframe>
```

The generated HTML contains its JavaScript, styles, fonts, and library notices;
it needs no Grafana server, internet connection, or companion assets.
It includes the interactive Query builder, real Nimble Channels table, search,
nested/merged views, selection warnings, Properties dialog, light/dark themes,
and Decimation settings. No output preview or real data queries are included.
The X-Channel display, inside Decimation settings, is read-only and cannot be cleared. **Edit X-Channel**
opens a flat Nimble table with Channel, File Name, and Group columns. Sample Index
is selected initially; Timestamp is also available. **Show all channels** starts
unchecked and limits channel rows to those selected in Channels; checking it
shows every channel in the matching files. Search filters all three columns.
Exactly one axis remains selected, even when search or the checkbox hides its
row. **OK** applies the draft; **Cancel** or Escape discards it. Reopening resets
search; the checkbox keeps its value for the current session. If the file filter removes the chosen channel, the
axis resets to Sample Index. This control does not alter mock sample output.
Changes remain in memory while the page is open and reset on reload.
When embedding with an iframe sandbox, allow scripts for the controls to work.
The HTML is generated output and is excluded from git; rebuild after changing
the source. Use `npm run typecheck:tdm-mockup` to check the standalone entry.

## Query

| Property | Operators |
| --- | --- |
| File ID | Equals |
| File Name | Equals, Does not equal |

Values use case-sensitive exact matching. Conditions can be combined into logical
groups. An empty filter shows **no files or channels** and returns no samples.

Available fixtures:

| File ID | File Name |
| --- | --- |
| tdm-file-001 | Current Gain Calibration.tdms |
| tdm-file-002 | Temperature Measurement.tdm |
| tdm-file-003 | Current Gain Verification.tdms |

For example, use **File ID Equals tdm-file-001** to display the calibration
channels. **File Name Does not equal Temperature Measurement.tdm** displays
both current-gain files.

The **X-Channel** control, inside Decimation settings, stores one selected axis per query. **Edit X-Channel** opens
a searchable table of Sample Index, Timestamp, and channels from the matching files.

## Channels

The selector follows the Data Spaces layout using Nimble controls and a name-only
Nimble tree table. Nested view shows file > channel group > channel; for a single
file it starts at the channel groups. Merged view combines identical channel names
across files and groups, displaying the instance count, for example `YValues (3)`.
Selecting a merged row selects its underlying channel instances. Switching views
preserves partial merged selections even when their merged row is unchecked.
Older saved queries with a flat view now open in merged view.

The channel tree contains only channels. Sample Index and Timestamp are sample
metadata columns in the query output, not selectable channels.

File/group checkboxes select all descendant channels, including collapsed or
search-hidden channels. Only channels count toward the maximum of 10 selections.
Grafana information and warning alerts show when the limit is reached or exceeded.
Both alerts are dismissible; the warning takes precedence over the information alert.
Dismissing either keeps the information alert hidden until selection drops below
10 channels. Changing the selected count shows the warning again if still over 10.
All selected channels remain checked and saved, even above 10. Over-limit targets
do not generate samples or return a query error; only the selector warning is shown.
Reducing the selection to 10 or fewer resumes sample output. Dismissing the warning
does not enable query execution. The clear button deselects all.

Search uses case-insensitive substring matching. Nested view matches file, group,
and channel names and keeps the ancestors of matching rows. Merged view searches
channel names. Search stays visible next to the view icons, with count/clear on
the right when channels are selected. Searching preserves hidden selections and
does not change query output. The nested row menu opens a Properties dialog containing
illustrative mock file/group/channel metadata, without making API calls.

Changing the file filter preserves only selections in files that still match.
Channels uses a Grafana collapsible container titled Channels, like the Data
Frames column configurations section, without a duplicate field label inside.
Collapsing and reopening the section preserves selections and search.
Switching views preserves selection. The filter, view,
and selected channel identities are saved with the Grafana query.

## Output

The collapsible Decimation settings section below Channels contains the X-Channel
selector and offers None, Lossy (default), Max/min, and Entry/exit, matching Data Frames. The chosen method is
saved with the query but is UI-only: it does not change mock samples.

Each selected channel returns 10 deterministic mock samples with these columns:

| Column | Grafana field type |
| --- | --- |
| File ID | String |
| File Name | String |
| Channel Group | String |
| Channel Name | String |
| Sample Index | Number |
| Timestamp | Time |
| Value | Number |

Sample Index and Timestamp are included for each selected channel. Sample indices
are 0-9. Timestamps start at the Grafana query range start with 1-second spacing.
Values are illustrative numbers, not real measurements.
The fixed sample count is independent of the range duration.
No selected channels means no sample rows. Hidden query targets are not executed.

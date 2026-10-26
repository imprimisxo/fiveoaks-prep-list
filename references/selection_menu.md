# Appetizer, salad or soup, dinner, and dessert selection menu

Chef asked for this on 2026-10-22. When he enters a host name and a dinner date, show
him a **single-selection menu of the dinners** and a **separate single-selection menu
of the desserts**, rather than asking in prose. On 2026-10-23 he added a third menu,
**Salads & Soups**. It's part of the dinner and served at 7:00 PM. On 2026-10-25 he
added **Appetizers** at 6:00 PM as two single-selection menus, **Duck** and
**Non-duck**: one of each per dinner, or none of either, the same as the web app. In
course order the appetizers come first, then salad or soup, entree, and dessert.

## How to show it

1. Call the visualize `read_me` tool with `modules: ["elicitation"]` once per
   conversation. It is silent setup, so don't mention it.
2. Call `show_widget` with the HTML below, filled in for the booking.
3. The answers come back as one line, for example
   `Dinner details — <Host> duck_app: <key> · <Host> nonduck_app: <key> · <Host> salad: <key> · <Host> dinner: <1-5> · <Host> dessert: <key> · <Host> guests: <count>`.
   Map `duck_app` to the request's `appetizer_duck`, `nonduck_app` to `appetizer_nonduck`,
   `salad` to `salad`, `dinner` to `meal`, and `dessert` to `dessert`. `none` means that
   course is skipped. Then continue at Step 2 of SKILL.md.

Fill-in rules:

- Replace `HOST` with the host's name and `DATE` with the dinner date written like
  `Fri, Nov 20`. Keep `host_` in each `data-name` as the host's name in lowercase with
  underscores, for example `jones_dinner`, so each answer comes back labeled by host.
  The first group in each set names HOST and DATE; when you drop a group that carries
  them, move "is HOST having on DATE" to the next group shown.
- **Several bookings in one message:** put one set of groups per booking inside the same
  form. Each set has the duck appetizer, non-duck appetizer, salad or soup, dinner,
  dessert, and guests if they're missing. Keep them in date order, so Chef answers every
  night in one pass.
- **Drop the guests group** when the guest count was already given. Drop any course group
  whose choice was already given. If everything is known, skip the form entirely.
- Keep the options in sync with `data/menu.json`. When Chef adds a salad, soup, meal, or
  dessert there, add its card here with the same `data-value`: the `salads_soups` key,
  the meal number, or the dessert key. Use the `ti-salad` icon for a salad and `ti-soup`
  for a soup. When he adds an appetizer, add a pill to its group (`category` `duck` or
  `non-duck`) with the `appetizers` key as its `data-value`, in alphabetical order. The
  appetizer groups use plain pills, not cards: the Duck group has 23 dishes.

If `show_widget` is not available in the session, fall back to a numbered menu in plain
text, in course order (duck appetizers, non-duck appetizers, salads and soups, dinners,
desserts), and ask Chef to reply with one number per menu. Don't use the multiple-choice
question tool: it caps a question at 4 options, and there are 23 duck appetizers.

## Template (one booking)

```html
<form class="elicit">
  <div class="elicit-header">
    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M11.586 2a1.5 1.5 0 0 1 1.06.44l2.914 2.914a1.5 1.5 0 0 1 .44 1.06V16.5a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.492-1.347L4 16.5v-13A1.5 1.5 0 0 1 5.5 2zM5.5 3a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V7h-2.5A1.5 1.5 0 0 1 11 5.5V3zm7.04 10.304a.5.5 0 0 1 .92.392c-.295.69-.871 1.304-1.66 1.304-.487 0-.892-.234-1.2-.574-.309.34-.713.574-1.2.574-.486 0-.892-.233-1.2-.574-.31.34-.714.574-1.2.574a.5.5 0 0 1 0-1c.212 0 .52-.18.74-.696l.034-.067a.5.5 0 0 1 .886.067c.221.516.528.696.74.696.213 0 .52-.18.74-.696l.035-.067a.5.5 0 0 1 .885.067c.22.516.527.696.74.696s.519-.18.74-.696m0-4a.5.5 0 0 1 .92.392c-.295.69-.871 1.304-1.66 1.304-.487 0-.892-.234-1.2-.574-.309.34-.713.574-1.2.574-.486 0-.892-.233-1.2-.574-.31.34-.714.574-1.2.574a.5.5 0 0 1 0-1c.212 0 .52-.18.74-.696l.034-.067a.5.5 0 0 1 .886.067c.221.516.528.696.74.696.213 0 .52-.18.74-.696l.035-.067a.5.5 0 0 1 .885.067c.22.516.527.696.74.696s.519-.18.74-.696M12 5.5a.5.5 0 0 0 .5.5h2.293L12 3.207z"/></svg>
    <span>Dinner details</span>
  </div>
  <div class="elicit-body">
    <div class="elicit-group">
      <label class="elicit-question">Which duck appetizer is HOST having on DATE? (6:00 PM, one)</label>
      <div class="elicit-pills" data-name="host_duck_app" data-multi="false">
        <button type="button" class="elicit-pill" data-value="asian-grilled-duck">Asian Grilled Duck</button>
        <button type="button" class="elicit-pill" data-value="bbq-duck-breast">BBQ Duck Breast</button>
        <button type="button" class="elicit-pill" data-value="duck-and-bacon-wonton-tacos">Duck and Bacon Wonton Tacos</button>
        <button type="button" class="elicit-pill" data-value="duck-and-cheese-wontons">Duck and Cheese Wontons</button>
        <button type="button" class="elicit-pill" data-value="duck-and-mushroom-flatbread">Duck and Mushroom Flatbread</button>
        <button type="button" class="elicit-pill" data-value="duck-arancini">Duck Arancini</button>
        <button type="button" class="elicit-pill" data-value="duck-asian-egg-rolls">Duck Asian Egg Rolls</button>
        <button type="button" class="elicit-pill" data-value="duck-beignets">Duck Beignets</button>
        <button type="button" class="elicit-pill" data-value="duck-carpaccio">Duck Carpaccio</button>
        <button type="button" class="elicit-pill" data-value="duck-confit-crab-cakes">Duck Confit Crab Cakes</button>
        <button type="button" class="elicit-pill" data-value="duck-confit-cream-cheese-dip">Duck Confit Cream Cheese Dip</button>
        <button type="button" class="elicit-pill" data-value="duck-confit-pizza">Duck Confit Pizza</button>
        <button type="button" class="elicit-pill" data-value="duck-confit-waffles">Duck Confit Waffles</button>
        <button type="button" class="elicit-pill" data-value="duck-empanadas">Duck Empanadas</button>
        <button type="button" class="elicit-pill" data-value="duck-nachos-three-ways">Duck Nachos, Three Ways</button>
        <button type="button" class="elicit-pill" data-value="duck-prosciutto">Duck Prosciutto (21 days)</button>
        <button type="button" class="elicit-pill" data-value="duck-roll-ups">Duck Roll Ups</button>
        <button type="button" class="elicit-pill" data-value="duck-southwest-egg-rolls">Duck Southwest Egg Rolls</button>
        <button type="button" class="elicit-pill" data-value="duck-tamales">Duck Tamales</button>
        <button type="button" class="elicit-pill" data-value="duck-tender-pow-pow">Duck Tender Pow Pow</button>
        <button type="button" class="elicit-pill" data-value="duck-wings-three-sauces">Duck Wings, Three Sauces</button>
        <button type="button" class="elicit-pill" data-value="fried-duck-tenders">Fried Duck Tenders</button>
        <button type="button" class="elicit-pill" data-value="smoked-duck-breast">Smoked Duck Breast</button>
        <button type="button" class="elicit-pill" data-value="none">No duck appetizer</button>
      </div>
    </div>
    <div class="elicit-group">
      <label class="elicit-question">Which non-duck appetizer? (one)</label>
      <div class="elicit-pills" data-name="host_nonduck_app" data-multi="false">
        <button type="button" class="elicit-pill" data-value="three-cheese-spinach-dip">3 Cheese Spinach Dip</button>
        <button type="button" class="elicit-pill" data-value="wild-mushroom-gruyere-tart">Wild Mushroom &amp; Gruyère Tart</button>
        <button type="button" class="elicit-pill" data-value="none">No non-duck appetizer</button>
      </div>
    </div>
    <div class="elicit-group">
      <label class="elicit-question">Which salad or soup?</label>
      <div class="elicit-pills" data-name="host_salad" data-multi="false">
        <button type="button" class="elicit-pill" data-value="ranch-salad" style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:220px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"><i class="ti ti-salad" style="font-size:20px" aria-hidden="true"></i><span><span style="font-size:13px; font-weight:500">1. Five Oaks Ranch Salad</span><br><span style="font-size:11px; color:var(--text-muted)">House ranch, croutons</span></span></button>
        <button type="button" class="elicit-pill" data-value="bacon-salad" style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:220px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"><i class="ti ti-salad" style="font-size:20px" aria-hidden="true"></i><span><span style="font-size:13px; font-weight:500">2. House Bacon Salad</span><br><span style="font-size:11px; color:var(--text-muted)">Spinach, egg, warm bacon dressing</span></span></button>
        <button type="button" class="elicit-pill" data-value="caesar-salad" style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:220px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"><i class="ti ti-salad" style="font-size:20px" aria-hidden="true"></i><span><span style="font-size:13px; font-weight:500">3. Caesar Salad</span><br><span style="font-size:11px; color:var(--text-muted)">Romaine, croutons, parm</span></span></button>
        <button type="button" class="elicit-pill" data-value="duck-gumbo" style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:220px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"><i class="ti ti-soup" style="font-size:20px" aria-hidden="true"></i><span><span style="font-size:13px; font-weight:500">4. Duck Gumbo</span><br><span style="font-size:11px; color:var(--text-muted)">Rice, scallions, parsley</span></span></button>
        <button type="button" class="elicit-pill" data-value="none">No salad or soup</button>
      </div>
    </div>
    <div class="elicit-group">
      <label class="elicit-question">Which entree?</label>
      <div class="elicit-pills" data-name="host_dinner" data-multi="false">
        <button type="button" class="elicit-pill" data-value="1" style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:220px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"><i class="ti ti-meat" style="font-size:20px" aria-hidden="true"></i><span><span style="font-size:13px; font-weight:500">1. Bone-in Cowboy Ribeye</span><br><span style="font-size:11px; color:var(--text-muted)">Wild mushrooms, Cajun rice, green beans</span></span></button>
        <button type="button" class="elicit-pill" data-value="2" style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:220px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"><i class="ti ti-tools-kitchen-2" style="font-size:20px" aria-hidden="true"></i><span><span style="font-size:13px; font-weight:500">2. Bone-in Filet with Demi-glace</span><br><span style="font-size:11px; color:var(--text-muted)">Au gratin rice, grilled broccolini</span></span></button>
        <button type="button" class="elicit-pill" data-value="3" style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:220px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"><i class="ti ti-flame" style="font-size:20px" aria-hidden="true"></i><span><span style="font-size:13px; font-weight:500">3. Prime Rib with Au Jus</span><br><span style="font-size:11px; color:var(--text-muted)">Mashed potatoes, green beans</span></span></button>
        <button type="button" class="elicit-pill" data-value="4" style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:220px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"><i class="ti ti-pig" style="font-size:20px" aria-hidden="true"></i><span><span style="font-size:13px; font-weight:500">4. Dry Aged Duroc Pork Ribeye</span><br><span style="font-size:11px; color:var(--text-muted)">Money sauce, au gratin rice, asparagus</span></span></button>
        <button type="button" class="elicit-pill" data-value="5" style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:220px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"><i class="ti ti-fish" style="font-size:20px" aria-hidden="true"></i><span><span style="font-size:13px; font-weight:500">5. Salmon with Creamy Dill Sauce</span><br><span style="font-size:11px; color:var(--text-muted)">Au gratin rice, lemon grilled asparagus</span></span></button>
      </div>
    </div>
    <div class="elicit-group">
      <label class="elicit-question">Which dessert?</label>
      <div class="elicit-pills" data-name="host_dessert" data-multi="false">
        <button type="button" class="elicit-pill" data-value="skillet-cookie" style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:220px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"><i class="ti ti-cookie" style="font-size:20px" aria-hidden="true"></i><span><span style="font-size:13px; font-weight:500">Chocolate Chip Skillet Cookie</span><br><span style="font-size:11px; color:var(--text-muted)">Blue Bell, hot fudge</span></span></button>
        <button type="button" class="elicit-pill" data-value="cheesecake" style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:220px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"><i class="ti ti-cake" style="font-size:20px" aria-hidden="true"></i><span><span style="font-size:13px; font-weight:500">Classic Cheesecake</span><br><span style="font-size:11px; color:var(--text-muted)">Strawberries, whipped cream</span></span></button>
        <button type="button" class="elicit-pill" data-value="bread-pudding" style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:220px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"><i class="ti ti-bread" style="font-size:20px" aria-hidden="true"></i><span><span style="font-size:13px; font-weight:500">Bread Pudding</span><br><span style="font-size:11px; color:var(--text-muted)">Bourbon caramel, whipped cream</span></span></button>
        <button type="button" class="elicit-pill" data-value="brownie" style="border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; text-align:left; min-width:220px; box-shadow:0 1px 2px rgba(0,0,0,0.04)"><i class="ti ti-ice-cream" style="font-size:20px" aria-hidden="true"></i><span><span style="font-size:13px; font-weight:500">Warm Chocolate Brownie</span><br><span style="font-size:11px; color:var(--text-muted)">Blue Bell, hot fudge</span></span></button>
        <button type="button" class="elicit-pill" data-value="none">No dessert</button>
      </div>
    </div>
    <div class="elicit-group">
      <label class="elicit-question">How many guests?</label>
      <input type="number" class="elicit-date" data-name="host_guests" min="1" max="60" placeholder="e.g. 12">
    </div>
  </div>
  <div class="elicit-footer">
    <button type="button" class="elicit-skip">Skip</button>
    <button type="button" class="elicit-submit">Build prep list</button>
  </div>
</form>
```

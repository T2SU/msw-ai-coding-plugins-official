# UI Real-World Patterns

A collection of validated UI code patterns. Copy and paste to use directly.

---

## 1. Popup Dialog

A modal popup with a message and OK / cancel buttons.

```lua
@Logic
@ExecSpace("ClientOnly")
script UIPopup extends Logic

    property TextComponent message = "uuid-text"
    property ButtonComponent btnOk = "uuid-btn-ok"
    property ButtonComponent btnCancel = "uuid-btn-cancel"
    property Entity popupGroup = "uuid-group"

    method void OnBeginPlay()
        self.popupGroup.Enable = false
    end

    method void Open(string msg, any onOk, any onCancel)
        self.onOk = onOk
        self.onCancel = onCancel
        self.message.Text = msg
        self.popupGroup.Enable = true

        self.okHandler = self.btnOk.Entity:ConnectEvent(ButtonClickEvent, function()
            if self.onOk ~= nil then self.onOk() end
            self:Close()
        end)
        self.cancelHandler = self.btnCancel.Entity:ConnectEvent(ButtonClickEvent, function()
            if self.onCancel ~= nil then self.onCancel() end
            self:Close()
        end)
    end

    method void Close()
        self.btnOk.Entity:DisconnectEvent(ButtonClickEvent, self.okHandler)
        self.btnCancel.Entity:DisconnectEvent(ButtonClickEvent, self.cancelHandler)
        self.popupGroup.Enable = false
    end

    method void OnEndPlay()
        self:Close()
    end
end
```

---

## 2. Toast Message

A notification that fades out after a fixed duration.

```lua
@Logic
@ExecSpace("ClientOnly")
script UIToast extends Logic

    property TextComponent message = "uuid-text"
    property Entity toastGroup = "uuid-group"
    property number duration = 2
    property number fadeDuration = 0.3

    method void OnBeginPlay()
        self.toastGroup.Enable = false
    end

    method void ShowMessage(string msg)
        self.message.Text = msg
        self.toastGroup.Enable = true

        local canvasGroup = self.toastGroup.CanvasGroupComponent
        canvasGroup.GroupAlpha = 1

        if self.timerId then
            _TimerService:ClearTimer(self.timerId)
        end

        local time = 0
        local preTime = _UtilLogic.ElapsedSeconds

        self.timerId = _TimerService:SetTimerRepeat(function()
            local delta = _UtilLogic.ElapsedSeconds - preTime
            time = time + delta
            preTime = _UtilLogic.ElapsedSeconds

            if time >= self.duration + self.fadeDuration then
                canvasGroup.GroupAlpha = 0
                self.toastGroup.Enable = false
                _TimerService:ClearTimer(self.timerId)
                self.timerId = nil
            elseif time >= self.duration then
                canvasGroup.GroupAlpha = 1 - (time - self.duration) / self.fadeDuration
            end
        end, 1/60)
    end

    method void OnEndPlay()
        if self.timerId then
            _TimerService:ClearTimer(self.timerId)
        end
    end
end
```

---

## 3. HP Bar (Progress Bar)

Implement an HP bar with SpriteGUIRenderer's Filled type.

```lua
@Component
@ExecSpace("ClientOnly")
script HPBar extends Component

    property SpriteGUIRendererComponent fillImage = "uuid-fill"
    property TextComponent hpText = "uuid-text"

    method void UpdateHP(number current, number max)
        local ratio = current / max
        ratio = math.max(0, math.min(1, ratio))
        self.fillImage.FillAmount = ratio
        self.hpText.Text = tostring(math.floor(current)) .. " / " .. tostring(math.floor(max))

        -- color transition: green -> yellow -> red
        if ratio > 0.5 then
            self.fillImage.Color = Color(0, 1, 0, 1)
        elseif ratio > 0.2 then
            self.fillImage.Color = Color(1, 1, 0, 1)
        else
            self.fillImage.Color = Color(1, 0, 0, 1)
        end
    end
end
```

**Note:** Set the SpriteGUIRenderer `Type` to `Filled(3)` and `FillMethod` to `Horizontal(0)`.

---

## 4. Scroll List + Item Cloning

Hide a template and add items via Clone.

```lua
@Logic
@ExecSpace("ClientOnly")
script ScrollList extends Logic

    property Entity itemTemplate = "uuid-template"
    property ScrollLayoutGroupComponent scrollLayout = "uuid-scroll"

    method void OnBeginPlay()
        self.itemTemplate:SetEnable(false)  -- hide template
        self.items = {}
    end

    method void AddItem(string text)
        local clone = self.itemTemplate:Clone("Item_" .. #self.items)
        clone:SetEnable(true)
        clone.TextComponent.Text = text
        table.insert(self.items, clone)
    end

    method void ClearAll()
        for _, item in ipairs(self.items) do
            item:Destroy()
        end
        self.items = {}
    end

    method void ScrollToBottom()
        self.scrollLayout:SetScrollNormalizedPosition(UITransformAxis.Vertical, 0.0)
    end

    method void OnEndPlay()
        self:ClearAll()
    end
end
```

---

## 5. GridView Large List

For 100+ items, use GridView instead of ScrollLayout.

```lua
@Logic
@ExecSpace("ClientOnly")
script InventoryGrid extends Logic

    property GridViewComponent gridView = "uuid-gridview"

    method void OnBeginPlay()
        self.data = {}
        -- initialize data
        for i = 1, 200 do
            table.insert(self.data, "Item " .. tostring(i))
        end

        self.gridView.TotalCount = #self.data
        self.gridView.OnRefresh = function(index, entity)
            -- index is 0-based
            entity.TextComponent.Text = self.data[index + 1]
            entity.SpriteGUIRendererComponent.Color = Color.white
        end
        self.gridView.OnClear = function(index, entity)
            -- clean up items that scrolled off-screen (optional)
        end
        self.gridView:Refresh(true, true)
    end

    method void RefreshData()
        self.gridView.TotalCount = #self.data
        self.gridView:Refresh(false, true)
    end
end
```

---

## 6. Tab UI (Toggle Group)

Activate only one tab at a time.

```lua
@Logic
@ExecSpace("ClientOnly")
script TabUI extends Logic

    property Entity tab1Content = "uuid-content1"
    property Entity tab2Content = "uuid-content2"
    property Entity tab3Content = "uuid-content3"
    property ButtonComponent tab1Btn = "uuid-btn1"
    property ButtonComponent tab2Btn = "uuid-btn2"
    property ButtonComponent tab3Btn = "uuid-btn3"

    method void OnBeginPlay()
        self.tabs = {self.tab1Content, self.tab2Content, self.tab3Content}
        self.tab1Btn.Entity:ConnectEvent(ButtonClickEvent, function() self:SelectTab(1) end)
        self.tab2Btn.Entity:ConnectEvent(ButtonClickEvent, function() self:SelectTab(2) end)
        self.tab3Btn.Entity:ConnectEvent(ButtonClickEvent, function() self:SelectTab(3) end)
        self:SelectTab(1)
    end

    method void SelectTab(number index)
        for i, tab in ipairs(self.tabs) do
            tab.Enable = (i == index)
        end
    end
end
```

---

## 7. Drag and Drop

Implement drag with UITouchReceiveComponent.

```lua
@Component
@ExecSpace("ClientOnly")
script Draggable extends Component

    method void OnBeginPlay()
        self.dragHandler = self.Entity:ConnectEvent(UITouchDragEvent, self.OnDrag)
    end

    method void OnDrag(UITouchDragEvent event)
        local transform = self.Entity.UITransformComponent
        local pos = transform.anchoredPosition
        transform.anchoredPosition = Vector2(
            pos.x + event.TouchDelta.x,
            pos.y + event.TouchDelta.y
        )
    end

    method void OnEndPlay()
        self.Entity:DisconnectEvent(UITouchDragEvent, self.dragHandler)
    end
end
```

---

## 8. Text Input + Chat

```lua
@Logic
@ExecSpace("ClientOnly")
script ChatUI extends Logic

    property TextInputComponent chatInput = "uuid-input"
    property TextComponent chatLog = "uuid-log"
    property ScrollLayoutGroupComponent scrollLayout = "uuid-scroll"
    property Entity messageTemplate = "uuid-template"

    method void OnBeginPlay()
        self.messageTemplate:SetEnable(false)
        self.submitHandler = self.chatInput.Entity:ConnectEvent(
            TextInputSubmitEvent, self.OnSubmit)
    end

    method void OnSubmit(TextInputSubmitEvent event)
        local text = event.text
        if text == "" then return end

        local msg = self.messageTemplate:Clone("Msg_" .. self.msgCount)
        msg:SetEnable(true)
        msg.TextComponent.Text = text
        self.msgCount = self.msgCount + 1

        -- scroll to bottom
        self.scrollLayout:SetScrollNormalizedPosition(UITransformAxis.Vertical, 0.0)
    end

    method void OnEndPlay()
        self.chatInput.Entity:DisconnectEvent(TextInputSubmitEvent, self.submitHandler)
    end
end
```

---

## 9. Cooldown Display (Radial FillAmount)

```lua
@Component
@ExecSpace("ClientOnly")
script CooldownUI extends Component

    property SpriteGUIRendererComponent cooldownOverlay = "uuid-overlay"
    property TextComponent cooldownText = "uuid-text"

    method void StartCooldown(number duration)
        self.cooldownOverlay.Entity:SetEnable(true)
        local time = 0
        local preTime = _UtilLogic.ElapsedSeconds

        self.timerId = _TimerService:SetTimerRepeat(function()
            local delta = _UtilLogic.ElapsedSeconds - preTime
            time = time + delta
            preTime = _UtilLogic.ElapsedSeconds

            local remaining = duration - time
            if remaining <= 0 then
                self.cooldownOverlay.FillAmount = 0
                self.cooldownOverlay.Entity:SetEnable(false)
                self.cooldownText.Text = ""
                _TimerService:ClearTimer(self.timerId)
                return
            end

            self.cooldownOverlay.FillAmount = remaining / duration
            self.cooldownText.Text = tostring(math.ceil(remaining))
        end, 1/60)
    end

    method void OnEndPlay()
        if self.timerId then
            _TimerService:ClearTimer(self.timerId)
        end
    end
end
```

**Setup:** SpriteGUIRenderer `Type=Filled(3)`, `FillMethod=Radial360(4)`, translucent black.

---

## 10. World UI (Overhead Name Tag)

Place UI at world coordinates with UIModeType.World.

```lua
@Component
@ExecSpace("ClientOnly")
script NameTag extends Component

    property TextComponent nameText = "uuid-text"

    method void OnBeginPlay()
        self.nameText.Text = self.Entity.Name
    end

    method void OnUpdate(number dt)
        -- follow the entity position
        local worldPos = self.Entity.TransformComponent.WorldPosition
        local uiTransform = self.nameText.Entity.UITransformComponent
        local screenPos = _UILogic:WorldToScreenPosition(Vector2(worldPos.x, worldPos.y + 1.5))
        local uiPos = _UILogic:ScreenToUIPosition(screenPos)
        uiTransform.anchoredPosition = uiPos
    end
end
```

---

## Common Rules Summary

1. **`@ExecSpace("ClientOnly")`** -- UI Logic / Component is client-only.
2. **Clean up in OnEndPlay** -- ClearTimer, DisconnectEvent, Destroy.
3. **Control display via Enable** -- popupGroup.Enable = true/false.
4. **Fade via GroupAlpha** -- CanvasGroupComponent.GroupAlpha.
5. **Move via anchoredPosition** -- never set Position directly.
6. **Animate with a 1/60 timer** -- _TimerService:SetTimerRepeat(fn, 1/60).
7. **Measure time with _UtilLogic.ElapsedSeconds** -- for delta calculation.

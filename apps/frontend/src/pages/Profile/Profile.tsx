// export default function Profile() {
//   return <h1>Профиль участника</h1>;
// }

import Section from "../../components/ui/Section/Section";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import Select from "../../components/ui/Select/Select";

export default function Profile() {
    return (
        <Section title="Профиль">
            <Input
                id="name"
                label="Имя"
                placeholder="Введите имя"
            />

            <Input
                id="city"
                label="Город"
                placeholder="Например, Минск"
            />
            
            <Select
                id="level"
                label="Уровень подготовки"
                options={[
                    { value: "beginner", label: "Новичок" },
                    { value: "intermediate", label: "Средний" },
                    { value: "advanced", label: "Продвинутый" },
                ]}
            />            

            <Button>
                Сохранить
            </Button>
        </Section>
    );
}